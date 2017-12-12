import {Component, Input} from "@angular/core";
import {CatalogueLine} from "../../model/publish/catalogue-line";
import {CatalogueService} from "../../catalogue.service";
import {Router} from "@angular/router";
import {BinaryObject} from "../../model/publish/binary-object";
import {UserService} from "../../../user-mgmt/user.service";
import * as myGlobals from '../../../globals';

@Component({
    selector: 'catalogue-line-view',
    templateUrl: './catalogue-line-view.component.html'
})

// Component that displays information for individual catalogue lines in the Catalogue page

export class CatalogueLineViewComponent {

    selectedTab: string = "Product Details";
    partyRole: string = "";
	public debug = myGlobals.debug;
    @Input() catalogueLine: CatalogueLine;
    @Input() presentationMode: string;

    private addImage(event: any) {
        let fileList: FileList = event.target.files;
        if (fileList.length > 0) {
            let images = this.catalogueLine.goodsItem.item.productImage;

            for (let i = 0; i < fileList.length; i++) {
                let file: File = fileList[i];
                let reader = new FileReader();

                reader.onload = function (e: any) {
                    let base64String = reader.result.split(',').pop();
                    let binaryObject = new BinaryObject(base64String, file.type, file.name, "", "");
                    images.push(binaryObject);
                };
                reader.readAsDataURL(file);
            }
        }
    }

    deleteImage(index: number): void {
        if (this.presentationMode == 'edit') {
            this.catalogueLine.goodsItem.item.productImage.splice(index, 1);
        }
    }
}
