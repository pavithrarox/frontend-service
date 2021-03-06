import { Component, OnInit } from '@angular/core';
import { Search } from './model/search';
import { SimpleSearchService } from './simple-search.service';
import { Router, ActivatedRoute} from "@angular/router";
import * as myGlobals from '../globals';
import {SearchContextService} from "./search-context.service";
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import {copy, roundToTwoDecimals, selectNameFromLabelObject} from '../common/utils';
import { CallStatus } from '../common/call-status';
import { CURRENCIES } from "../catalogue/model/constants";
import { CategoryService } from '../catalogue/category/category.service';
import { Category } from '../catalogue/model/category/category';
import { DEFAULT_LANGUAGE} from '../catalogue/model/constants';
import {Code} from '../catalogue/model/publish/code';
import {CatalogueService} from "../catalogue/catalogue.service";
import {PublishService} from "../catalogue/publish-and-aip.service";
import {ShoppingCartDataService} from '../bpe/shopping-cart/shopping-cart-data-service';

@Component({
	selector: 'simple-search-form',
	templateUrl: './simple-search-form.component.html',
	styleUrls: ['./simple-search-form.component.css']
})

export class SimpleSearchFormComponent implements OnInit {

    product_vendor = myGlobals.product_vendor;
    product_vendor_id = myGlobals.product_vendor_id;
    product_vendor_name = myGlobals.product_vendor_name;
    product_vendor_brand_name = myGlobals.product_vendor_brand_name;
    product_vendor_rating = myGlobals.product_vendor_rating;
    product_vendor_rating_seller = myGlobals.product_vendor_rating_seller;
    product_vendor_rating_fulfillment = myGlobals.product_vendor_rating_fulfillment;
    product_vendor_rating_delivery = myGlobals.product_vendor_rating_delivery;
    product_vendor_trust = myGlobals.product_vendor_trust;
    product_name = myGlobals.product_name;
    product_description = myGlobals.product_description;
    product_img = myGlobals.product_img;
    product_vendor_img = myGlobals.product_vendor_img;
    product_price = myGlobals.product_price;
    product_currency = myGlobals.product_currency;
    product_filter_prod = myGlobals.product_filter_prod;
    product_filter_comp = myGlobals.product_filter_comp;
    product_filter_trust = myGlobals.product_filter_trust;
    product_filter_mappings = myGlobals.product_filter_mappings;
    product_nonfilter_full = myGlobals.product_nonfilter_full;
    product_nonfilter_regex = myGlobals.product_nonfilter_regex;
    product_cat = myGlobals.product_cat;
    product_cat_mix = myGlobals.product_cat_mix;
    party_facet_field_list = myGlobals.party_facet_field_list;
    party_filter_main = myGlobals.party_filter_main;
    party_filter_trust = myGlobals.party_filter_trust;
    roundToTwoDecimals = roundToTwoDecimals;
    item_manufacturer_id = myGlobals.item_manufacturer_id;
    searchIndex = myGlobals.config.defaultSearchIndex;
    searchIndexes = ["Name", "Category"];
    searchTopic = null;

    CURRENCIES = CURRENCIES;
    selectedCurrency: any = myGlobals.config.standardCurrency;
    selectedPriceMin: any;
    selectedPriceMax: any;

    ratingOverall = 0;
    ratingSeller = 0;
    ratingFulfillment = 0;
    ratingDelivery = 0;
    ratingTrust = 0;

    showCatSection = true;
    showProductSection = false;
    showCompSection = false;
    showTrustSection = false;
    showOtherSection = false;

    categoriesCallStatus: CallStatus = new CallStatus();
    shoppingCartCallStatus: CallStatus = new CallStatus();
    searchCallStatus: CallStatus = new CallStatus();
    searchDone = false;
    callback = false;
    showOther = false;
    size = 0;
    page = 1;
    rows = 12;
    start = 0;
    end = 0;
    display = "list";
    sort = "score desc";
    cat = "";
    catID = "";
    cat_level = -2;
    cat_levels = [];
    cat_other = [];
    cat_other_count = 0;
    cat_loading = true;
    suggestions = [];
    searchContext = null;
    model = new Search('');
    objToSubmit = new Search('');
    facetObj: any;
    facetQuery: any;
    temp: any;
    response: any;
    imageMap: any = {}; // keeps the images if exists for the search results
    // check whether 'p' query parameter exists or not
    noP = true;

    maxFacets = 5;

    //manufacturer.legalName : {id,count}
    //manufacturerIdCountMap : { [indx : string], string};
    manufacturerIdCountMap: any;

    imgEndpoint = myGlobals.user_mgmt_endpoint + "/company-settings/image/";
    zoomedImgURL = "assets/empty_img.png";

    config = myGlobals.config;
    getMultilingualLabel = selectNameFromLabelObject;
    // used to get labels of the ubl properties
    ublProperties = null;

    partyNamesList: any;

    delegatedSearch: boolean = false;
    pageRef = ''; // page where the user is navigated from. empty string ('') means the search is opened directly

    productsSelectedForPublish: any[] = []; // keeps the products in the Solr format
    // we use the following field to show call status properly
    // it stores the selected line which will be added to the shopping basket
    selectedLineForShoppingBasket:any = null;

    constructor(private simpleSearchService: SimpleSearchService,
                private searchContextService: SearchContextService,
                private categoryService: CategoryService,
                private catalogueService: CatalogueService,
                private publishService: PublishService,
                private shoppingCartDataService: ShoppingCartDataService,
                public route: ActivatedRoute,
                public router: Router) {
    }

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            let q = params['q'];
            let fq = params['fq'];
            let p = params['p'];
            let rows = params['rows'];
            let sort = params['sort'];
            let cat = params['cat'];
            let catID = params['catID'];
            let del = params['del'];
            let pageRef = params['pageRef'];
            if (p) {
                this.noP = false;
            }
            let searchContext = params['searchContext'];
            let sIdx = params['sIdx'];
            if (sIdx)
                this.searchIndex = sIdx;
            else
                this.searchIndex = myGlobals.config.defaultSearchIndex;
            let sTop = params['sTop'];
            if (sTop)
                this.searchTopic = sTop;
            else
                this.searchTopic = null;
            let display = params['display'];
            if (display)
                this.display = display;
            else
                this.display = "list";
            if (fq)
                fq = decodeURIComponent(fq).split("_SEP_");
            else
                fq = [];
            if (rows && !isNaN(rows)) {
                rows = parseInt(rows);
                this.rows = rows;
            }
            else
                rows = 12;
            if (p && !isNaN(p)) {
                p = parseInt(p);
                this.size = p * rows;
                this.page = p;
            }
            else
                p = 1;
            if (sort) {
                this.sort = sort;
            }
            else {
                sort = "score desc";
                this.sort = sort;
            }
            if (cat) {
                this.cat = cat;
            }
            else
                this.cat = "";
            if (catID) {
                this.catID = catID;
            }
            else
                this.catID = "";
            if (del && del == "1")
                this.delegatedSearch = true;
            else
                this.delegatedSearch = false;
            if (pageRef) {
                this.pageRef = pageRef;
            }
            if (searchContext == null) {
                this.searchContextService.clearSearchContext();
            } else {
                this.searchContext = searchContext;
            }
            if (q && sTop) {
                if (sTop == "prod")
                    this.getCall(q, fq, p, rows, sort, cat, catID, sIdx, sTop);
                else if (sTop == "comp")
                    this.getCompCall(q, fq, p, rows, sort, sTop);
            } else if (sTop) {
                this.callback = false;
                this.searchDone = false;
                this.searchCallStatus.reset();
                //this.model.q='';
                //this.objToSubmit.q='';
                this.model.q = '*';
                this.objToSubmit.q = '*';
                this.facetQuery = fq;
                this.page = p;
                this.rows = rows;
                this.sort = sort;
                //this.getCatTree();
                this.objToSubmit = copy(this.model);
                this.page = 1;
                this.get(this.objToSubmit);
            }
            else {
                this.callback = false;
                this.searchDone = false;
                this.searchCallStatus.reset();
                this.model.q = '*';
                this.objToSubmit.q = '*';
                this.facetQuery = fq;
                this.page = p;
                this.rows = rows;
                this.sort = sort;
            }
        });

        // initialize the shopping cart
        this.shoppingCartDataService.getShoppingCart();
    }

    get(search: Search): void {
        this.router.navigate(['/simple-search'], {
            queryParams: {
                q: search.q,
                fq: encodeURIComponent(this.facetQuery.join('_SEP_')),
                p: this.page,
                rows: this.rows,
                display: this.display,
                sort: this.sort,
                searchContext: this.searchContext,
                cat: this.cat,
                catID: this.catID,
                sIdx: this.searchIndex,
                sTop: this.searchTopic,
                del: this.delegatedSearch ? '1' : '0',
                pageRef: this.pageRef
            }
        });
    }

    setSearchTopic(sTop: string): void {
        this.router.navigate(['/simple-search'], {
            queryParams: {
                q: "*",
                fq: encodeURIComponent(this.facetQuery.join('_SEP_')),
                p: this.page,
                rows: this.rows,
                display: this.display,
                sort: this.sort,
                searchContext: this.searchContext,
                cat: this.cat,
                catID: this.catID,
                sIdx: this.searchIndex,
                sTop: sTop,
                del: this.delegatedSearch ? '1' : '0',
                pageRef: this.pageRef
            }
        });
    }

    setRows(rows: any): void {
        this.router.navigate(['/simple-search'], {
            queryParams: {
                q: this.objToSubmit.q,
                fq: encodeURIComponent(this.facetQuery.join('_SEP_')),
                p: 1,
                rows: parseInt(rows),
                display: this.display,
                sort: this.sort,
                searchContext: this.searchContext,
                cat: this.cat,
                catID: this.catID,
                sIdx: this.searchIndex,
                sTop: this.searchTopic,
                del: this.delegatedSearch ? '1' : '0',
                pageRef: this.pageRef
            }
        });
    }

    setDisplay(display: any): void {
        this.router.navigate(['/simple-search'], {
            queryParams: {
                q: this.objToSubmit.q,
                fq: encodeURIComponent(this.facetQuery.join('_SEP_')),
                p: this.page,
                rows: this.rows,
                display: display,
                sort: this.sort,
                searchContext: this.searchContext,
                cat: this.cat,
                catID: this.catID,
                sIdx: this.searchIndex,
                sTop: this.searchTopic,
                del: this.delegatedSearch ? '1' : '0',
                pageRef: this.pageRef
            }
        });
    }

    setSort(sort: any): void {
        this.router.navigate(['/simple-search'], {
            queryParams: {
                q: this.objToSubmit.q,
                fq: encodeURIComponent(this.facetQuery.join('_SEP_')),
                p: this.page,
                rows: this.rows,
                display: this.display,
                sort: sort,
                searchContext: this.searchContext,
                cat: this.cat,
                catID: this.catID,
                sIdx: this.searchIndex,
                sTop: this.searchTopic,
                del: this.delegatedSearch ? '1' : '0',
                pageRef: this.pageRef
            }
        });
    }

    private changeSearchIndex(indexName) {
        if (this.searchIndex != indexName) {
            this.searchIndex = indexName;
        }
    }

    getSuggestions = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            switchMap(term =>
                this.simpleSearchService.getSuggestions(term, ("{LANG}_" + this.product_name), this.searchIndex)
            )
        );

    getCompSuggestions = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            switchMap(term =>
                this.simpleSearchService.getCompSuggestions(term, [this.product_vendor_name, ("{LANG}_" + this.product_vendor_brand_name)])
            )
        );

    private getCatTree(): void {
        this.categoriesCallStatus.submit();
        this.simpleSearchService.get("*", [this.product_cat_mix], [""], 1, 1, "score desc", "", "", this.searchIndex, this.delegatedSearch)
        .then(res => {
            // if res.facets are null, it means that there is no product in the index
            if (res.facets == null || Object.keys(res.facets).indexOf(this.product_cat_mix) == -1) {
                this.categoriesCallStatus.callback("Categories loaded.", true);
            } else {
                // before starting to build category tree, we have to get categories to retrieve their names
                this.buildCatTree(res.facets[this.product_cat_mix].entry);
                //this.categoriesCallStatus.callback("Categories loaded.", true);
            }
        })
        .catch(error => {
            this.categoriesCallStatus.error("Error while loading category tree.", error);
        });
    }

    private async buildCatTree(categoryCounts: any[]) {
        var taxonomy = "eClass";
        if (this.config.standardTaxonomy.localeCompare("All") != 0 && this.config.standardTaxonomy.localeCompare("eClass") != 0) {
            taxonomy = this.config.standardTaxonomy;
        }
        var taxonomyPrefix = "";
        if (this.config.categoryFilter[taxonomy] && this.config.categoryFilter[taxonomy].ontologyPrefix)
            taxonomyPrefix = this.config.categoryFilter[taxonomy].ontologyPrefix;

        // retrieve the labels for the category uris included in the categoryCounts field
        let categoryUris: string[] = [];
        for (let categoryCount of categoryCounts) {
            categoryUris.push(categoryCount.label);
        }
        this.cat_loading = true;
        var indexCategories = await this.categoryService.getCategories(categoryUris);
        let categoryDisplayInfo: any = this.getCategoryDisplayInfo(indexCategories);
        let split_idx: any = -1;
        let name: any = "";
        if (taxonomyPrefix != "") {
            // ToDo: Remove manual distinction after search update
            // ================================================================================
            if (taxonomy == "eClass") {
                this.cat_levels = [[], [], [], []];
                for (let categoryCount of categoryCounts) {
                    let facet_inner = categoryCount.label;
                    var count = categoryCount.count;
                    if (facet_inner.startsWith(taxonomyPrefix)) {
                        var eclass_idx = categoryDisplayInfo[facet_inner].code;
                        if (eclass_idx % 1000000 == 0) {
                            this.cat_levels[0].push({
                                "name": facet_inner,
                                "id": facet_inner,
                                "count": count,
                                "preferredName": selectNameFromLabelObject(categoryDisplayInfo[facet_inner].label)
                            });
                        }
                        else if (eclass_idx % 10000 == 0) {
                            this.cat_levels[1].push({
                                "name": facet_inner,
                                "id": facet_inner,
                                "count": count,
                                "preferredName": selectNameFromLabelObject(categoryDisplayInfo[facet_inner].label)
                            });
                        }
                        else if (eclass_idx % 100 == 0) {
                            this.cat_levels[2].push({
                                "name": facet_inner,
                                "id": facet_inner,
                                "count": count,
                                "preferredName": selectNameFromLabelObject(categoryDisplayInfo[facet_inner].label)
                            });
                        }
                        else {
                            this.cat_levels[3].push({
                                "name": facet_inner,
                                "id": facet_inner,
                                "count": count,
                                "preferredName": selectNameFromLabelObject(categoryDisplayInfo[facet_inner].label)
                            });
                        }
                    }
                }
                this.sortCatLevels();
            }
            // ================================================================================
            // if (this.cat == "") {
            else if (this.cat == "") {
                this.cat_levels = [];
                var lvl = [];

                for (let categoryCount of categoryCounts) {
                    var count = categoryCount.count;
                    var ontology = categoryCount.label;
                    if (categoryDisplayInfo[ontology] != null && ontology.indexOf(taxonomyPrefix) != -1) {
                        split_idx = ontology.lastIndexOf("#");
                        name = ontology.substr(split_idx + 1);
                        if (categoryDisplayInfo[ontology].isRoot && this.config.categoryFilter[taxonomy].hiddenCategories.indexOf(name) == -1) {
                            if (ontology.startsWith(taxonomyPrefix)) {
                                lvl.push({
                                    "name": ontology,
                                    "id": ontology,
                                    "count": count,
                                    "preferredName": selectNameFromLabelObject(categoryDisplayInfo[ontology].label)
                                });
                            } else {
                                lvl.push({"name": ontology, "id": ontology, "count": count, "preferredName": ontology});
                            }
                        }
                    }
                }
                this.cat_levels.push(lvl);
                this.sortCatLevels();
            }
            else {
                var catLevels = [];
                this.constructCategoryTree(indexCategories.result, catLevels);
                this.cat_levels = [];
                for (var i = 0; i < catLevels.length; i++) {
                    var lvl = [];
                    var constructedLevel: string[] = catLevels[i];
                    for (let uri of constructedLevel) {
                        let categoryCount = categoryCounts.find(cat => cat.label == uri);
                        if (categoryCount != null) {
                            var count = categoryCount.count;
                            var ontology = categoryCount.label;

                            if (categoryDisplayInfo[uri] != null && uri.indexOf(taxonomyPrefix) != -1) {
                                split_idx = uri.lastIndexOf("#");
                                name = uri.substr(split_idx + 1);
                                if (this.config.categoryFilter[taxonomy].hiddenCategories.indexOf(name) == -1) {
                                    if (ontology.startsWith(taxonomyPrefix)) {
                                        lvl.push({
                                            "name": uri,
                                            "id": uri,
                                            "count": count,
                                            "preferredName": selectNameFromLabelObject(categoryDisplayInfo[uri].label)
                                        });
                                    } else {
                                        lvl.push({"name": uri, "id": uri, "count": count, "preferredName": name});
                                    }
                                }
                            }
                        }
                    }
                    this.cat_levels.push(lvl);
                }
                this.sortCatLevels();
            }
        }
        this.cat_loading = false;
        this.categoriesCallStatus.callback("Categories loaded.", true);
    }

    private constructCategoryTree(indexCategories: any[], levels: string[][]) {

        if (levels.length == 0) {
            // get root categories
            let rootCategories: any[] = [];
            for (let category of indexCategories) {
                if (category.allParents == null) {
                    rootCategories.push(category.uri);
                }
            }
            levels.push(rootCategories);
            this.constructCategoryTree(indexCategories, levels);

        } else {
            let parentCategoryUris: string[] = levels[levels.length - 1];
            let level: string[] = []; // contains all children of all the parent categories of an upper level
            for (let parentCategoryUri of parentCategoryUris) {
                let parentIndexCategory = indexCategories.find(indexCategory => indexCategory.uri == parentCategoryUri);
                let children: string[] = parentIndexCategory.children;
                if (children != null) {
                    for (let childCategoryUri of children) {
                        let childCategory = indexCategories.find(indexCategory => indexCategory.uri == childCategoryUri);
                        if (childCategory != null) {
                            level.push(childCategoryUri);
                        }
                    }
                }
            }
            if (level.length > 0) {
                levels.push(level);
                this.constructCategoryTree(indexCategories, levels);
            }
        }
    }

    private sortCatLevels() {
        for (var i = 0; i < this.cat_levels.length; i++) {
            this.cat_levels[i].sort(function (a, b) {
                var a_c: string = a.name;
                var b_c: string = b.name;
                return a_c.localeCompare(b_c);
            });
            this.cat_levels[i].sort(function (a, b) {
                return b.count - a.count;
            });
        }
        this.cat_level = this.getCatLevel(this.cat);
    }

    private getCatLevel(name: string): number {
        var level = -2;
        if (name != "")
            level = -1;
        for (var j = 0; j < this.cat_levels.length; j++) {
            for (var i = 0; i < this.cat_levels[j].length; i++) {
                var comp = this.cat_levels[j][i].name;
                if (comp.localeCompare(name) == 0) {
                    level = j;
                }
            }
        }
        return level;
    }

    private getCall(q: string, fq: any, p: number, rows: number, sort: string, cat: string, catID: string, sIdx: string, sTop: string) {
        this.cat_loading = true;
        this.searchDone = true;
        if (q == "*")
            this.model.q = "";
        else
            this.model.q = q;
        this.objToSubmit.q = q;
        this.facetQuery = fq;
        this.page = p;
        this.rows = rows;
        this.sort = sort;
        this.searchIndex = sIdx;
        this.searchTopic = sTop;
        this.searchCallStatus.submit();
        this.simpleSearchService.getFields(this.delegatedSearch)
        .then(res => {
            let fieldLabels: string [] = this.getFieldNames(res);
            this.simpleSearchService.get(q, Object.keys(fieldLabels), fq, p, rows, sort, cat, catID, this.searchIndex, this.delegatedSearch)
            .then(res => {
                if (res.result.length == 0) {
                    this.cat_loading = false;
                    this.callback = true;
                    this.searchCallStatus.callback("Search done.", true);
                    this.response = res.result;
                    this.size = res.totalElements;
                    this.page = p;
                    this.start = this.page * this.rows - this.rows + 1;
                    this.end = this.start + res.result.length - 1;
                }
                else {
                    this.simpleSearchService.getUblProperties(Object.keys(fieldLabels)).then(response => {
                        this.facetObj = [];
                        this.temp = [];
                        this.manufacturerIdCountMap = new Map();

                        for (let facet in res.facets) {
                            if (facet == this.product_cat_mix) {
                                this.buildCatTree(res.facets[this.product_cat_mix].entry);
                                this.handleFacets(fieldLabels, res, p, response.result);
                                break;
                            }
                        }

                        for (let facet in res.facets) {
                            if (facet == this.item_manufacturer_id) {
                                let facetEntries = res.facets[this.item_manufacturer_id].entry;
                                for (let manufacturerEntry of facetEntries) {
                                    this.manufacturerIdCountMap.set(manufacturerEntry.label, manufacturerEntry.count);
                                }
                                //getting the manufacturer ids list
                                let manufacturerIds = Array.from(this.manufacturerIdCountMap.keys());
                                this.getCompanyNameFromIds(manufacturerIds).then((res1) => {
                                    this.handleCompanyFacets(res1, "manufacturer.", this.manufacturerIdCountMap);
                                    //this.cat_loading = false;
                                    this.callback = true;
                                    this.searchCallStatus.callback("Search done.", true);

                                    this.temp = res.result;
                                    for (let doc in this.temp) {
                                        if (this.temp[doc][this.product_img]) {
                                            var img = this.temp[doc][this.product_img];
                                            if (Array.isArray(img)) {
                                                this.temp[doc][this.product_img] = img[0];
                                            }
                                        }
                                    }

                                    this.response = copy(this.temp);
                                    this.size = res.totalElements;
                                    this.page = p;
                                    this.start = this.page * this.rows - this.rows + 1;
                                    this.end = this.start + res.result.length - 1;

                                }).catch((error) => {
                                    this.searchCallStatus.error("Error while creating Vendor filters in the search.", error);
                                });
                                break;
                            }
                        }

                    }).catch(error => {
                        this.searchCallStatus.error("Error while running search.", error);
                    })
                    this.fetchImages(res.result, this.product_img);
                }

            })
            .catch(error => {
                this.searchCallStatus.error("Error while running search.", error);
            });
        })
        .catch(error => {
            this.searchCallStatus.error("Error while running search.", error);
        });
    }

    private getCompCall(q: string, fq: any, p: number, rows: number, sort: string, sTop: string) {
        this.cat_loading = true;
        this.searchDone = true;
        if (q == "*")
            this.model.q = "";
        else
            this.model.q = q;
        this.objToSubmit.q = q;
        this.facetQuery = fq;
        this.page = p;
        this.rows = rows;
        this.sort = sort;
        this.searchTopic = sTop;
        this.searchCallStatus.submit();
        this.simpleSearchService.getCompFields(this.delegatedSearch)
        .then(res => {
            let fieldLabels: string [] = this.getFieldNames(res);
            this.simpleSearchService.getComp(q, Object.keys(fieldLabels), fq, p, rows, sort, this.delegatedSearch)
            .then(res => {
                if (res.result.length == 0) {
                    this.cat_loading = false;
                    this.callback = true;
                    this.searchCallStatus.callback("Company search done.", true);
                    this.response = res.result;
                    this.size = res.totalElements;
                    this.page = p;
                    this.start = this.page * this.rows - this.rows + 1;
                    this.end = this.start + res.result.length - 1;
                }
                else {
                    this.simpleSearchService.getUblProperties(Object.keys(fieldLabels)).then(response => {
                        this.facetObj = [];
                        this.temp = [];
                        this.handleFacets(fieldLabels, res, p, response.result);
                        this.callback = true;
                        this.searchCallStatus.callback("Company search done.", true);

                        this.temp = res.result;
                        for (let doc in this.temp) {
                            if (this.temp[doc][this.product_vendor_img]) {
                                var img = this.temp[doc][this.product_vendor_img];
                                if (Array.isArray(img)) {
                                    this.temp[doc][this.product_vendor_img] = img[0];
                                }
                            }
                        }

                        this.response = copy(this.temp);
                        this.size = res.totalElements;
                        this.page = p;
                        this.start = this.page * this.rows - this.rows + 1;
                        this.end = this.start + res.result.length - 1;
                    }).catch(error => {
                        this.searchCallStatus.error("Error while running company search.", error);
                    })
                }

            })
            .catch(error => {
                this.searchCallStatus.error("Error while running company search.", error);
            });
        })
        .catch(error => {
            this.searchCallStatus.error("Error while running company search.", error);
        });
    }

    fetchImages(searchResults: any[], field): void {
        // fetch images asynchronously
        this.imageMap = {};

        let imageMap: any = {};
        for (let result of searchResults) {
            let productImages: string[] = result[field];
            if (productImages != null && productImages.length > 0) {
                imageMap[result.uri] = productImages[0];
            }
        }

        let imageUris: string[] = [];
        for (let productUri in imageMap) {
            imageUris.push(imageMap[productUri]);
        }
        if (imageUris.length > 0) {
            this.catalogueService.getBinaryObjects(imageUris).then(images => {
                for (let image of images) {
                    for (let productUri in imageMap) {
                        if (imageMap[productUri] == image.uri) {
                            this.imageMap[productUri] = "data:" + image.mimeCode + ";base64," + image.value
                        }
                    }
                }
            }, error => {
            });
        }
    }

    handleCompanyFacets(res, prefix: string, manufacturerIdCountMap: any) {
        //this.facetObj = [];
        this.temp = [];
        //map for name:id
        //loop through the result sent to create name:Id mapping
        let manufacturerNameIdMap = new Map();
        for (let i = 0; i < res.result.length; i++) {
            let manufacturerId = res.result[i].id;
            let manufacturerName = res.result[i].legalName;
            manufacturerNameIdMap.set(manufacturerName, manufacturerId);
        }

        for (let facet in res.facets) {
            if (this.simpleSearchService.checkField(facet)) {
                let propertyLabel = this.getName(facet);
                let facet_innerLabel;
                let facet_innerCount;
                let facetCount = 0;

                let name = prefix + res.facets[facet].fieldName;
                let realName = prefix + res.facets[facet].fieldName;

                let genName = name;
                if (genName.indexOf(DEFAULT_LANGUAGE() + "_") != -1)
                    genName = genName.replace(DEFAULT_LANGUAGE() + "_", "");

                let total = 0;
                let selected = false;

                //creating options[]
                let options: any[] = [];

                for (let facet_inner of res.facets[facet].entry) {
                    facet_innerLabel = facet_inner.label;
                    facet_innerCount = facet_inner.count;
                    if (facet == "legalName") {
                        let id = manufacturerNameIdMap.get(facet_innerLabel);
                        let itemCountForManufacturer = manufacturerIdCountMap.get(id);
                        facetCount = itemCountForManufacturer;
                    }

                    if (facet_innerLabel != "" && facet_innerLabel != ":" && facet_innerLabel != ' ' && facet_innerLabel.indexOf("urn:oasis:names:specification:ubl:schema:xsd") == -1) {
                        options.push({
                            "name": facet_inner.label,
                            "realName": facet_innerLabel,
                            "count": facetCount
                        });
                        total += facetCount;
                        if (this.checkFacet(name, facet_inner.label))
                            selected = true;
                    }
                }

                options.sort(function (a, b) {
                    var a_c = a.name;
                    var b_c = b.name;
                    return a_c.localeCompare(b_c);
                });
                options.sort(function (a, b) {
                    return b.count - a.count;
                });
                if (total == 0)
                    total = 1;
                this.facetObj.push({
                    "name": name,
                    "genName": genName,
                    "realName": realName,
                    "options": options,
                    "total": total,
                    "selected": selected,
                    "expanded": false
                });
            }
        }

    }

    handleFacets(facetMetadata, res, p, ublProperties) {
        this.ublProperties = ublProperties;
        this.facetObj = [];
        this.temp = [];
        var index = 0;
        for (let facet in res.facets) {
            if (this.simpleSearchService.checkField(facet)) {
                let facetMetadataExists: boolean = facetMetadata[facet] != null && facetMetadata[facet].label != null;
                let propertyLabel = this.getName(facet);
                let genName = facet;
                if (genName.indexOf(DEFAULT_LANGUAGE() + "_") != -1)
                    genName = genName.replace(DEFAULT_LANGUAGE() + "_", "");

                this.facetObj.push({
                    "name": facet,
                    "genName": genName,
                    "realName": facetMetadataExists ? selectNameFromLabelObject(facetMetadata[facet].label) : propertyLabel,
                    "options": [],
                    "total": 0,
                    "selected": false,
                    "expanded": false
                });

                let label;
                let facet_innerLabel;
                let facet_innerCount;
                let tmp_lang = DEFAULT_LANGUAGE();
                let atLeastOneMultilingualLabel: number = res.facets[facet].entry.findIndex(facetInner => {
                    var idx = facetInner.label.lastIndexOf("@" + DEFAULT_LANGUAGE());
                    return (idx != -1 && idx + 3 == facetInner.label.length);
                });
                if (atLeastOneMultilingualLabel == -1) {
                    atLeastOneMultilingualLabel = res.facets[facet].entry.findIndex(facetInner => {
                        var idx = facetInner.label.lastIndexOf("@en");
                        return (idx != -1 && idx + 3 == facetInner.label.length);
                    });
                }
                if (atLeastOneMultilingualLabel == -1) {
                    atLeastOneMultilingualLabel = res.facets[facet].entry.findIndex(facetInner => {
                        var idx = facetInner.label.lastIndexOf("@");
                        return (idx != -1 && idx + 3 == facetInner.label.length);
                    });
                }
                if (atLeastOneMultilingualLabel != -1) {
                    var idx = res.facets[facet].entry[atLeastOneMultilingualLabel].label.lastIndexOf("@");
                    tmp_lang = res.facets[facet].entry[atLeastOneMultilingualLabel].label.substring(idx + 1);
                }
                for (let facet_inner of res.facets[facet].entry) {
                    facet_innerLabel = facet_inner.label;
                    facet_innerCount = facet_inner.count;
                    //if(facetMetadataExists && facetMetadata[facet].dataType == 'string') {
                    if (atLeastOneMultilingualLabel != -1) {
                        let idx = facet_innerLabel.lastIndexOf("@" + tmp_lang);
                        if (idx != -1) {
                            facet_innerLabel = label = facet_innerLabel.substring(0, idx);
                        } else {
                            // there is at least one label in the preferred language but this is not one of them
                            continue;
                        }
                    }
                    //}

                    if (facet_innerLabel != "" && facet_innerLabel != ":" && facet_innerLabel != ' ' && facet_innerLabel.indexOf("urn:oasis:names:specification:ubl:schema:xsd") == -1) {
                        this.facetObj[index].options.push({
                            "name": facet_inner.label, // the label with the language id, if there is any
                            "realName": facet_innerLabel, // the displayed label
                            "count": facet_innerCount
                        });
                        this.facetObj[index].total += facet_innerCount;
                        if (this.checkFacet(this.facetObj[index].name, facet_inner.label))
                            this.facetObj[index].selected = true;
                    }
                }

                this.facetObj[index].options.sort(function (a, b) {
                    var a_c = a.name;
                    var b_c = b.name;
                    return a_c.localeCompare(b_c);
                });
                this.facetObj[index].options.sort(function (a, b) {
                    return b.count - a.count;
                });
                index++;
                this.facetObj.sort(function (a, b) {
                    var a_c = a.name;
                    var b_c = b.name;
                    return a_c.localeCompare(b_c);
                });
                this.facetObj.sort(function (a, b) {
                    return b.total - a.total;
                });
                this.facetObj.sort(function (a, b) {
                    var ret = 0;
                    if (a.selected && !b.selected)
                        ret = -1;
                    else if (!a.selected && b.selected)
                        ret = 1;
                    return ret;
                });
            }
        }
    }

    private getFieldNames(fields: any[]): any {
        let fieldLabes = {};
        for (let field of fields) {
            fieldLabes[field.fieldName] = {};
            fieldLabes[field.fieldName].label = field.label;
            fieldLabes[field.fieldName].dataType = field.dataType;
        }
        return fieldLabes;
    }

    onSubmit() {
        this.objToSubmit = copy(this.model);
        this.page = 1;
        this.get(this.objToSubmit);
    }

    onSearchResultClicked(event): void {
        // if the page reference is publish, we don't let users navigating to product details
        if (this.pageRef === 'publish') {
            event.preventDefault();
        }
    }

    callCat(name: string, id: string) {
        this.model.q = "*";
        this.objToSubmit = copy(this.model);
        this.cat = name;
        this.catID = id;
        this.get(this.objToSubmit);
    }

    getName(name: string, prefix?: string) {
        // if it is a ubl property, then get its label from the ublProperties
        let prefName = name;
        if (prefix)
            prefName = prefix + "." + name;
        for (let ublProperty of this.ublProperties) {
            if (prefName == ublProperty.localName || name == ublProperty.localName) {
                return selectNameFromLabelObject(ublProperty.label);
            }
        }
        // otherwise, use product_filter_mappings
        var ret = prefName;
        if (this.product_filter_mappings[prefName]) {
            ret = this.product_filter_mappings[prefName];
        }
        else if (this.product_filter_mappings[name]) {
            ret = this.product_filter_mappings[name];
        }
        return ret;
    }

    checkPriceFilter() {
        var check = false;
        if (this.selectedCurrency && this.selectedPriceMin && this.selectedPriceMax) {
            if (this.selectedPriceMin < this.selectedPriceMax) {
                check = true;
            }
        }
        return check;
    }

    checkTrustFilter() {
        var check = false;
        if (this.ratingOverall > 0 || this.ratingSeller > 0 || this.ratingFulfillment > 0 || this.ratingDelivery > 0 || this.ratingTrust > 0)
            check = true;
        return check;
    }

    checkPriceFacet() {
        var found = false;
        for (var i = 0; i < this.facetQuery.length; i++) {
            var comp = this.facetQuery[i].split(":")[0];
            if (comp.localeCompare(this.lowerFirstLetter(this.selectedCurrency) + "_" + this.product_price) == 0) {
                found = true;
            }
        }
        return found;
    }

    checkTrustFacet() {
        var found = false;
        for (var i = 0; i < this.facetQuery.length; i++) {
            var comp = this.facetQuery[i].split(":")[0];
            if (comp.localeCompare(this.product_vendor + "." + this.product_vendor_rating) == 0 || comp.localeCompare(this.product_vendor + "." + this.product_vendor_rating_seller) == 0 || comp.localeCompare(this.product_vendor + "." + this.product_vendor_rating_fulfillment) == 0 || comp.localeCompare(this.product_vendor + "." + this.product_vendor_rating_delivery) == 0 || comp.localeCompare(this.product_vendor + "." + this.product_vendor_trust) == 0) {
                found = true;
            }
        }
        return found;
    }

    checkCompTrustFacet() {
        var found = false;
        for (var i = 0; i < this.facetQuery.length; i++) {
            var comp = this.facetQuery[i].split(":")[0];
            if (comp.localeCompare(this.product_vendor_rating) == 0 || comp.localeCompare(this.product_vendor_rating_seller) == 0 || comp.localeCompare(this.product_vendor_rating_fulfillment) == 0 || comp.localeCompare(this.product_vendor_rating_delivery) == 0 || comp.localeCompare(this.product_vendor_trust) == 0) {
                found = true;
            }
        }
        return found;
    }

    setPriceFilter() {
        this.clearFacet(this.lowerFirstLetter(this.selectedCurrency) + "_" + this.product_price);
        this.setRangeWithoutQuery(this.lowerFirstLetter(this.selectedCurrency) + "_" + this.product_price, this.selectedPriceMin, this.selectedPriceMax);
        this.get(this.objToSubmit);
    }

    setTrustFilter() {
        this.clearFacet(this.product_vendor_rating, this.product_vendor);
        this.clearFacet(this.product_vendor_rating_seller, this.product_vendor);
        this.clearFacet(this.product_vendor_rating_fulfillment, this.product_vendor);
        this.clearFacet(this.product_vendor_rating_delivery, this.product_vendor);
        this.clearFacet(this.product_vendor_trust, this.product_vendor);
        if (this.ratingOverall > 0)
            this.setRangeWithoutQuery(this.product_vendor_rating, this.ratingOverall, 5, this.product_vendor);
        if (this.ratingSeller > 0)
            this.setRangeWithoutQuery(this.product_vendor_rating_seller, this.ratingSeller, 5, this.product_vendor);
        if (this.ratingFulfillment > 0)
            this.setRangeWithoutQuery(this.product_vendor_rating_fulfillment, this.ratingFulfillment, 5, this.product_vendor);
        if (this.ratingDelivery > 0)
            this.setRangeWithoutQuery(this.product_vendor_rating_delivery, this.ratingDelivery, 5, this.product_vendor);
        if (this.ratingTrust > 0)
            this.setRangeWithoutQuery(this.product_vendor_trust, (this.ratingTrust / 5), 1, this.product_vendor);
        this.get(this.objToSubmit);
    }

    setCompTrustFilter() {
        this.clearFacet(this.product_vendor_rating);
        this.clearFacet(this.product_vendor_rating_seller);
        this.clearFacet(this.product_vendor_rating_fulfillment);
        this.clearFacet(this.product_vendor_rating_delivery);
        this.clearFacet(this.product_vendor_trust);
        if (this.ratingOverall > 0)
            this.setRangeWithoutQuery(this.product_vendor_rating, this.ratingOverall, 5);
        if (this.ratingSeller > 0)
            this.setRangeWithoutQuery(this.product_vendor_rating_seller, this.ratingSeller, 5);
        if (this.ratingFulfillment > 0)
            this.setRangeWithoutQuery(this.product_vendor_rating_fulfillment, this.ratingFulfillment, 5);
        if (this.ratingDelivery > 0)
            this.setRangeWithoutQuery(this.product_vendor_rating_delivery, this.ratingDelivery, 5);
        if (this.ratingTrust > 0)
            this.setRangeWithoutQuery(this.product_vendor_trust, (this.ratingTrust / 5), 1);
        this.get(this.objToSubmit);
    }

    resetPriceFilter() {
        this.selectedCurrency = myGlobals.config.standardCurrency;
        this.selectedPriceMin = null;
        this.selectedPriceMax = null;
        this.clearFacet(this.lowerFirstLetter(this.selectedCurrency) + "_" + this.product_price);
        this.get(this.objToSubmit);
    }

    resetTrustFilter() {
        this.ratingOverall = 0;
        this.ratingSeller = 0;
        this.ratingFulfillment = 0;
        this.ratingDelivery = 0;
        this.ratingTrust = 0;
        this.clearFacet(this.product_vendor_rating, this.product_vendor);
        this.clearFacet(this.product_vendor_rating_seller, this.product_vendor);
        this.clearFacet(this.product_vendor_rating_fulfillment, this.product_vendor);
        this.clearFacet(this.product_vendor_rating_delivery, this.product_vendor);
        this.clearFacet(this.product_vendor_trust, this.product_vendor);
        this.get(this.objToSubmit);
    }

    resetCompTrustFilter() {
        this.ratingOverall = 0;
        this.ratingSeller = 0;
        this.ratingFulfillment = 0;
        this.ratingDelivery = 0;
        this.ratingTrust = 0;
        this.clearFacet(this.product_vendor_rating);
        this.clearFacet(this.product_vendor_rating_seller);
        this.clearFacet(this.product_vendor_rating_fulfillment);
        this.clearFacet(this.product_vendor_rating_delivery);
        this.clearFacet(this.product_vendor_trust);
        this.get(this.objToSubmit);
    }

    checkProdCat(name: string) {
        var found = false;
        if (this.product_filter_prod.indexOf(name) != -1) {
            found = true;
        }
        return found;
    }

    checkProdCatCount() {
        var count = 1;
        if (this.facetObj) {
            for (var i = 0; i < this.facetObj.length; i++) {
                if (this.checkProdCat(this.facetObj[i].name)) {
                    count++;
                }
            }
        }
        return count;
    }

    checkCompCat(name: string) {
        var found = false;
        if (this.product_filter_comp.indexOf(name) != -1) {
            found = true;
        }
        return found;
    }

    checkCompCatCount() {
        var count = 0;
        if (this.facetObj) {
            for (var i = 0; i < this.facetObj.length; i++) {
                if (this.checkCompCat(this.facetObj[i].name)) {
                    count++;
                }
            }
        }
        return count;
    }

    checkTrustCat(name: string) {
        var found = false;
        if (this.product_filter_trust.indexOf(name) != -1) {
            found = true;
        }
        return found;
    }

    checkTrustCatCount() {
        var count = 0;
        if (this.facetObj) {
            for (var i = 0; i < this.facetObj.length; i++) {
                if (this.checkTrustCat(this.facetObj[i].name)) {
                    count++;
                }
            }
        }
        return count;
    }

    checkOtherCat(name: string) {
        for (let nonFilter of this.product_nonfilter_regex) {
            if (name.search(nonFilter) != -1) {
                return false;
            }
        }
        return (!this.checkProdCat(name) && !this.checkCompCat(name) && !this.checkTrustCat(name));
    }

    checkOtherCatCount() {
        var count = 0;
        if (this.facetObj) {
            for (var i = 0; i < this.facetObj.length; i++) {
                if (this.checkOtherCat(this.facetObj[i].name)) {
                    count++;
                }
            }
        }
        return count;
    }

    checkCompMainCat(name: string) {
        var found = false;
        if (this.party_filter_main.indexOf(name) != -1) {
            found = true;
        }
        return found;
    }

    checkCompMainCatCount() {
        var count = 0;
        if (this.facetObj) {
            for (var i = 0; i < this.facetObj.length; i++) {
                if (this.checkCompMainCat(this.facetObj[i].name)) {
                    count++;
                }
            }
        }
        return count;
    }

    checkCompTrustCat(name: string) {
        var found = false;
        if (this.party_filter_trust.indexOf(name) != -1) {
            found = true;
        }
        return found;
    }

    checkCompTrustCatCount() {
        var count = 0;
        if (this.facetObj) {
            for (var i = 0; i < this.facetObj.length; i++) {
                if (this.checkCompTrustCat(this.facetObj[i].name)) {
                    count++;
                }
            }
        }
        return count;
    }

    clearFacet(outer: string, prefix?: string) {
        if (prefix)
            outer = prefix + "." + outer;
        var idx = -1;
        for (var i = 0; i < this.facetQuery.length; i++) {
            var comp = this.facetQuery[i].split(":")[0];
            if (comp.localeCompare(outer) == 0) {
                idx = i;
            }
        }
        if (idx >= 0) {
            this.facetQuery.splice(idx, 1);
        }
    }

    getFacetName(facet: string): string {
        var name = facet;
        for (var i = 0; i < this.facetObj.length; i++) {
            var comp = this.facetObj[i].name;
            if (comp.localeCompare(facet) == 0) {
                name = this.facetObj[i].realName;
            }
        }
        return this.getName(name);
    }

    getFacetQueryName(facet: string): string {
        var name = facet.split(":")[0];
        if (name.indexOf(DEFAULT_LANGUAGE() + "_") != -1)
            name = name.replace(DEFAULT_LANGUAGE() + "_", "");
        name = this.getFacetName(name);
        return name;
    }

    getFacetQueryValue(facet: string): string {
        var value = facet.split(":")[1];
        value = value.split("@")[0];
        value = value.replace(/"/g, "");
        return value;
    }

    clearFacetQuery(facet: string) {
        this.facetQuery.splice(this.facetQuery.indexOf(facet), 1);
        this.get(this.objToSubmit);
    }

    setFacet(outer: string, inner: string, prefix?: string) {
        if (prefix)
            outer = prefix + "." + outer;
        var fq = outer + ":\"" + inner + "\"";
        if (this.facetQuery.indexOf(fq) == -1)
            this.facetQuery.push(fq);
        else
            this.facetQuery.splice(this.facetQuery.indexOf(fq), 1);
        this.get(this.objToSubmit);
    }

    setFacetWithoutQuery(outer: string, inner: string, prefix?: string) {
        if (prefix)
            outer = prefix + "." + outer;
        var fq = outer + ":\"" + inner + "\"";
        this.facetQuery.push(fq);
    }

    setRangeWithoutQuery(outer: string, min: number, max: number, prefix?: string) {
        if (prefix)
            outer = prefix + "." + outer;
        var fq = outer + ":[" + min + " TO " + max + "]";
        this.facetQuery.push(fq);
    }

    setCat(name: string, id: string) {
        this.cat = name;
        this.catID = id;
        this.get(this.objToSubmit);
    }

    resetFilter() {
        this.facetQuery = [];
        this.selectedCurrency = myGlobals.config.standardCurrency;
        this.selectedPriceMin = null;
        this.selectedPriceMax = null;
        this.ratingOverall = 0;
        this.ratingSeller = 0;
        this.ratingFulfillment = 0;
        this.ratingDelivery = 0;
        this.ratingTrust = 0;
        this.get(this.objToSubmit);
    }

    checkFacet(outer: string, inner: string): boolean {
        var match = false;
        var fq = outer + ":\"" + inner + "\"";
        if (this.facetQuery.indexOf(fq) != -1)
            match = true;
        return match;
    }

    getCurrency(price: any): string {
        if (price[this.selectedCurrency])
            return this.selectedCurrency;
        if (this.selectedCurrency != myGlobals.config.standardCurrency && price[myGlobals.config.standardCurrency])
            return myGlobals.config.standardCurrency;
        if (this.selectedCurrency != "EUR" && price["EUR"])
            return "EUR";
        return Object.keys(price)[0];
    }

    getCurrencySort(order: any): string {
        let currency = myGlobals.config.standardCurrency;
        let currentFirstLower = currency.charAt(0).toLowerCase() + currency.slice(1);
        return (currentFirstLower + "_price " + order);
    }

    getCategoryDisplayInfo(categories: any): any {
        let labelMap = {};
        for (let category of categories.result) {
            labelMap[category.uri] = {};
            labelMap[category.uri].label = category.label;
            labelMap[category.uri].code = category.code;
            labelMap[category.uri].isRoot = category.allParents == null ? true : false;
        }
        return labelMap;
    }

    checkNaN(rating: any): boolean {
        var nan = false;
        if (isNaN(parseFloat(rating)))
            nan = true;
        return nan;
    }

    checkEmpty(obj: any): boolean {
        return (Object.keys(obj).length === 0);
    }

    calcRating(rating: any, multiplier: number): number {
        var result = parseFloat(rating) * multiplier;
        var rounded = Math.round(result * 10) / 10;
        return rounded;
    }

    lowerFirstLetter(string) {
        return string.charAt(0).toLowerCase() + string.slice(1);
    }

    isJson(str: string): boolean {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    redirectToRating(event: any, result: any) {
        event.preventDefault();
        this.router.navigate(['product-details'], {queryParams: {catalogueId: result.catalogueId, id: result.manufactuerItemId, tabToOpen: "rating"}});
    }

    getCompanyNameFromIds(idList: any[]): Promise<any> {
        let facets = this.party_facet_field_list.slice();
        for (let i = 0; i < facets.length; i++) {
            facets[i] = facets[i].replace("{LANG}_", (DEFAULT_LANGUAGE() + "_"));
        }
        /*
         if (this.delegatedSearch)
         facets = [this.product_vendor_name];
         */
        let query = "";
        let length = idList.length;
        while (length--) {
            //full_url += "&fq="+encodeURIComponent(facetQuery);
            query = query + "id:" + idList[length];
            if (length != 0) {
                query = query + " OR ";
            }
        }
        return this.simpleSearchService.getCompanies(query, facets, idList, this.delegatedSearch);
    }

    getProdLink(res: any): string {
        let link = "";
        if (res && res.catalogueId && res.manufactuerItemId) {
            if (!res.isFromLocalInstance && res.sourceFrontendServiceUrl && res.sourceFrontendServiceUrl != "")
                link += res.sourceFrontendServiceUrl;
            link += "#/product-details?catalogueId=" + res.catalogueId + "&id=" + res.manufactuerItemId;
        }
        return link;
    }

    getCompLink(res: any): string {
        let link = "";
        if (res && res.id) {
            if (!res.isFromLocalInstance && res.sourceFrontendServiceUrl && res.sourceFrontendServiceUrl != "")
                link += res.sourceFrontendServiceUrl;
            link += "#/user-mgmt/company-details?id=" + res.id;
        }
        return link;
    }

    productSelected(productHjid): boolean {
        let i: number = this.productsSelectedForPublish.findIndex(product => product.uri === productHjid);
        return i !== -1;
    }

    onToggleProductSelectForPublish(toggledProduct: any, event): void {
        event.preventDefault();
        // set timeout is required since the default checkbox implementation prevents updating status of the checkbox
        setTimeout(() => {
            let i: number = this.productsSelectedForPublish.findIndex(product => product.uri === toggledProduct.uri);
            if (i === -1) {
                this.productsSelectedForPublish.push(toggledProduct);
            } else {
                this.onRemoveSelectedProduct(toggledProduct.uri);
            }
        });
    }

    onRemoveSelectedProduct(removedProductHjid: any): void {
        let selectedIndex: number = this.productsSelectedForPublish.findIndex(product => product.uri === removedProductHjid);
        this.productsSelectedForPublish.splice(selectedIndex, 1);
    }

    onContinuePublishing(): void {
        this.publishService.selectedProductsInSearch = this.productsSelectedForPublish.map(product => {
            return {hjid: product.uri, label: product.label};
        });
        this.router.navigate(['catalogue/publish'], {queryParams: {pg: 'single', productType: 'product', searchRef: 'true'}});
    }

    onAddToCart(result: any, event: any): void {
        event.preventDefault();
        // do not add item to the cart if a process is still being added
        if (this.shoppingCartCallStatus.isLoading()) {
            return;
        }
        // set the selected line
        this.selectedLineForShoppingBasket = result;
        this.shoppingCartCallStatus.submit();
        this.shoppingCartDataService.addItemToCart(result.uri).then(() => {
            this.shoppingCartCallStatus.callback("Product is added to shopping cart.", false);
        }).catch(() => {
            this.shoppingCartCallStatus.error(null);
        });
    }
}
