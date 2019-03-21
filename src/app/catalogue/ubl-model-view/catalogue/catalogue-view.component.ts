import {Component, OnInit} from "@angular/core";
import {CookieService} from 'ng2-cookies';
import {CatalogueService} from "../../catalogue.service";
import {CallStatus} from "../../../common/call-status";
import {ActivatedRoute, Params, Router} from "@angular/router";
import {PublishService} from "../../publish-and-aip.service";
import {CategoryService} from "../../category/category.service";
import { isTransportService } from "../../../common/utils";
import { BPDataService } from "../../../bpe/bp-view/bp-data-service";
import { UserService } from "../../../user-mgmt/user.service";
import { CompanySettings } from "../../../user-mgmt/model/company-settings";
import {CataloguePaginationResponse} from '../../model/publish/catalogue-pagination-response';
import {Item} from '../../model/publish/item';
import {selectDescription, selectName} from '../../../common/utils';
import {ItemProperty} from '../../model/publish/item-property';
import {debounceTime, distinctUntilChanged, switchMap} from 'rxjs/operators';
import {Observable} from 'rxjs/Observable';
import {CATALOGUE_LINE_SORT_OPTIONS} from '../../model/constants';

@Component({
    selector: 'catalogue-view',
    templateUrl: './catalogue-view.component.html',
    styles: ['.dropdown-toggle:after{content: initial}'],
    providers: [CookieService]
})

export class CatalogueViewComponent implements OnInit {

    catalogueResponse: CataloguePaginationResponse;
    settings: CompanySettings;

    // available catalogue lines with respect to the selected category
    catalogueLinesWRTTypes: any = [];
    // catalogue lines which are available to the user after search operation
    catalogueLinesArray : any = [];

    // categories
    categoryNames : any = [];
    selectedCategory = "All";

    // necessary info for pagination
    collectionSize = 0;
    page = 1;
    // default
    pageSize = 10;

    // check whether catalogue-line-panel should be displayed for a specific catalogue line
    catalogueLineView = {};

    sortOption = null;

    getCatalogueStatus = new CallStatus();
    callStatus = new CallStatus();
    deleteStatuses: CallStatus[] = [];

    CATALOGUE_LINE_SORT_OPTIONS = CATALOGUE_LINE_SORT_OPTIONS;

    private searchText: string = "";

    constructor(private cookieService: CookieService,
                private publishService: PublishService,
                private catalogueService: CatalogueService,
                private categoryService: CategoryService,
                private bpDataService: BPDataService,
                private userService: UserService,
                private route: ActivatedRoute,
                private router: Router) {

    }

    ngOnInit() {
        this.catalogueService.setEditMode(false);
        this.requestCatalogue();
        for(let i = 0; i < this.pageSize; i++) {
            this.deleteStatuses.push(new CallStatus());
        }
    }

    selectName (ip: ItemProperty | Item) {
        return selectName(ip);
    }

    selectDescription (item:  Item) {
        return selectDescription(item);
    }

    search = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            switchMap(term =>{
                this.requestCatalogue();
                return [];
            })
        );

    requestCatalogue(): void {
        this.getCatalogueStatus.submit();
        const userId = this.cookieService.get("user_id");
        // check whether the user chose a category to filter the catalogue lines
        let categoryName = this.selectedCategory == "All" ? null : this.selectedCategory;
        Promise.all([
            this.catalogueService.getCatalogueResponse(userId, categoryName,this.searchText,this.pageSize,(this.page-1)*this.pageSize,this.sortOption),
            this.getCompanySettings(userId)
        ])
            .then(([catalogueResponse, settings]) => {
                    this.catalogueResponse = catalogueResponse;
                    this.settings = settings;
                    this.init();
                    this.getCatalogueStatus.callback(null);
                },
                error => {
                    this.getCatalogueStatus.error("Failed to get catalogue", error);
                }
            )
    }

    private getCompanySettings(userId: string): Promise<CompanySettings> {
        if(this.settings) {
            return Promise.resolve(this.settings);
        }

        return this.userService.getSettingsForUser(userId);
    }

    private init(): void {
        let len = this.catalogueResponse.catalogueLines.length;
        this.categoryNames = this.catalogueResponse.categoryNames;
        this.collectionSize = this.catalogueResponse.size;
        this.catalogueLinesArray = [...this.catalogueResponse.catalogueLines];
        this.catalogueLinesWRTTypes = this.catalogueLinesArray;
        let i = 0;
        // Initialize catalogueLineView
        for(;i<len;i++){
            this.catalogueLineView[this.catalogueResponse.catalogueLines[i].id] = false;
        }
    }

    onDeleteCatalogue(): void {
        if (confirm("Are you sure that you want to delete your entire catalogue?")) {
            this.callStatus.submit();

            this.catalogueService.deleteCatalogue().then(res => {
                    this.callStatus.reset();
                    this.requestCatalogue();
                },
                error => {
                    this.callStatus.error("Failed to delete catalogue", error);
                }
            );
        }
    }

    onOpenCatalogueLine(e: Event) {
        e.stopImmediatePropagation();
    }

    redirectToEdit(catalogueLine) {
        this.catalogueService.editCatalogueLine(catalogueLine);
        this.publishService.publishMode = 'edit';
        this.publishService.publishingStarted = false;
        this.categoryService.resetSelectedCategories();
        this.router.navigate(['catalogue/publish'], {queryParams: {
                pg: "single",
                productType: isTransportService(catalogueLine) ? "transportation" : "product"}});
    }

    deleteCatalogueLine(catalogueLine, i: number): void {
        if (confirm("Are you sure that you want to delete this catalogue item?")) {
            const status = this.getDeleteStatus(i);
            status.submit();
            this.catalogueService.deleteCatalogueLine(this.catalogueService.catalogueResponse.catalogueUuid, catalogueLine.id)
                .then(res => {
                    this.requestCatalogue();
                    status.callback("Catalogue line deleted", true);
                })
                .catch(error => {
                    status.error("Error while deleting catalogue line");
                });
        }
    }

    getDeleteStatus(index: number): CallStatus {
        return this.deleteStatuses[index % this.pageSize];
    }

    uploadImagePackage(event: any): void {
        this.callStatus.submit();
        let catalogueService = this.catalogueService;
        let fileList: FileList = event.target.files;
        if (fileList.length > 0) {
            let file: File = fileList[0];
            let self = this;
            var reader = new FileReader();
            reader.onload = function (e) {
                // reset the target value so that the same file could be chosen more than once
                event.target.value = "";
                catalogueService.uploadZipPackage(file).then(res => {
                        self.callStatus.callback(null);
                        self.router.navigate(['dashboard'], {queryParams: {tab: "CATALOGUE"}});
                        self.requestCatalogue();
                    },
                    error => {
                        self.callStatus.error("Failed to upload the image package:  " + error, error);
                    });
            };
            reader.readAsDataURL(file);
        }
    }

    onExportCatalogue():void{
        this.callStatus.submit();

        this.catalogueService.exportCatalogue(this.catalogueService.catalogueResponse.catalogueUuid)
            .then(result => {
                    var link = document.createElement('a');
                    link.id = 'downloadLink';
                    link.href = window.URL.createObjectURL(result.content);
                    link.download = result.fileName;

                    document.body.appendChild(link);
                    var downloadLink = document.getElementById('downloadLink');
                    downloadLink.click();
                    document.body.removeChild(downloadLink);

                    this.callStatus.callback("Catalogue is exported");
                },
                error => {
                    this.callStatus.error("Failed to export catalogue");
                });
    }

    deleteAllProductImages():void{
        if (confirm("Are you sure that you want to delete all product images inside the catalogue?")) {
            this.callStatus.submit();
            this.catalogueService.deleteAllProductImagesInsideCatalogue(this.catalogueService.catalogueResponse.catalogueUuid)
                .then(res => {
                    this.requestCatalogue();
                    this.callStatus.callback("Product images deleted", true);
                })
                .catch(error => {
                    this.callStatus.error("Error while deleting product images");
                });
        }
    }

    navigateToThePublishPage(){
        this.router.navigate(['/catalogue/categorysearch']);
    }

    navigateToBulkUploadPage() {
        this.router.navigate(["/catalogue/publish"], { queryParams: { pg: 'bulk', productType: 'product'}});
    }
}
