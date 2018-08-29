import { Component, OnInit, OnDestroy, Renderer2 } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CallStatus } from "../../common/call-status";
import { CatalogueService } from "../../catalogue/catalogue.service";
import { CatalogueLine } from "../../catalogue/model/publish/catalogue-line";
import { BPDataService } from "./bp-data-service";
import { Subscription } from "rxjs";
import { ProductBpStepStatus } from "./product-bp-step-status";
import { ProductWrapper } from "../../common/product-wrapper";
import { BpWorkflowOptions } from "../model/bp-workflow-options";
import { ProcessType } from "../model/process-type";
import { ProductBpStep } from "./product-bp-step";
import { ProductBpStepsDisplay } from "./product-bp-steps-display";
import { isTransportService } from "../../common/utils";
import { UserService } from "../../user-mgmt/user.service";
import { CompanyNegotiationSettings } from "../../user-mgmt/model/company-negotiation-settings";
import { CompanySettings } from "../../user-mgmt/model/company-settings";
import { BPEService } from "../bpe.service";
import { Order } from "../../catalogue/model/publish/order";

/**
 * Created by suat on 20-Oct-17.
 */
@Component({
    selector: "product-bp-options",
    templateUrl: "./product-bp-options.component.html",
    styleUrls: ["./product-bp-options.component.css"]
})
export class ProductBpOptionsComponent implements OnInit, OnDestroy {
    processType: ProcessType;
    currentStep: ProductBpStep;
    stepsDisplayMode: ProductBpStepsDisplay;
    callStatus: CallStatus = new CallStatus();
    processTypeSubs: Subscription;

    id: string;
    catalogueId: string;

    line: CatalogueLine;
    wrapper: ProductWrapper;
    options: BpWorkflowOptions;
    settings: CompanySettings;

    originalOrder?: Order;
    serviceLine?: CatalogueLine;
    serviceWrapper?: ProductWrapper;

    productExpanded: boolean = false;
    serviceExpanded: boolean = false;

    constructor(public bpDataService: BPDataService, 
                public catalogueService: CatalogueService, 
                public userService: UserService,
                public bpeService: BPEService,
                public route: ActivatedRoute,
                private renderer: Renderer2) {
        this.renderer.setStyle(document.body, "background-image", "none");
    }

    ngOnInit() {
        this.processTypeSubs = this.bpDataService.processTypeObservable.subscribe(processType => {
            if (processType) {
                this.processType = processType;
                this.currentStep = this.getCurrentStep(processType);
                this.stepsDisplayMode = this.getStepsDisplayMode();
            }
        });

        this.route.queryParams.subscribe(params => {
            const id = params["id"];
            const catalogueId = params["catalogueId"];
            this.bpDataService.precedingProcessId = params["pid"];

            if (this.id !== id || this.catalogueId !== catalogueId) {
                this.id = id;
                this.catalogueId = catalogueId;

                this.callStatus.submit();

                Promise.all([
                    this.catalogueService.getCatalogueLine(catalogueId, id),
                    this.getOriginalOrder()
                ]).then(([line, order]) => {
                    this.line = line;
                    this.originalOrder = order;

                    return Promise.all([
                        this.getReferencedCatalogueLine(line, order),
                        this.userService.getSettingsForProduct(line)
                    ])
                })
                .then(([referencedLine, settings]) => {
                    if(referencedLine) {
                        // there is an order that references another product -> the line is a service and the referencedLine is the original product
                        this.serviceLine = this.line;
                        this.serviceWrapper = new ProductWrapper(this.serviceLine, settings.negotiationSettings);
                        this.line = referencedLine;
                        return this.userService.getSettingsForProduct(referencedLine);
                    }

                    this.initWithCatalogueLine(this.line, settings);
                    return null;
                })
                .then(settings => {
                    if(settings) {
                        this.initWithCatalogueLine(this.line, settings);
                    }
                    this.callStatus.callback("Retrieved product details", true);
                })
                .catch(error => {
                    this.callStatus.error("Failed to retrieve product details", error);
                });
            }
        });
    }

    ngOnDestroy(): void {
        this.processTypeSubs.unsubscribe();
        this.renderer.setStyle(document.body, "background-image", "url('assets/bg_global.jpg')");
    }

    getStepsStatus(): ProductBpStepStatus {
        return this.bpDataService.processMetadata ? this.bpDataService.processMetadata.status : "OPEN"
    }

    getStepsStatusText(): string {
        if(this.bpDataService.processMetadata) {
            return this.bpDataService.processMetadata.statusText;
        }
        return ""
    }

    isReadOnly(): boolean {
        return !this.bpDataService.updatingProcess || this.bpDataService.getProcessType() == 'Fulfilment' || this.bpDataService.getProcessType() == 'Transport_Execution_Plan';
    }

    onToggleProductExpanded() {
        this.productExpanded = !this.productExpanded;
        this.serviceExpanded = false;
    }

    onToggleServiceExpanded() {
        this.serviceExpanded = !this.serviceExpanded;
        this.productExpanded = false;
    }

    private isOrderDone(): boolean {
        return (this.processType === "Order" || this.processType === "Transport_Execution_Plan")
            && this.bpDataService.processMetadata 
            && this.bpDataService.processMetadata.processStatus === "Completed";
    }

    private getOriginalOrder(): Promise<Order | null> {
        if(!this.bpDataService.processMetadata) {
            return Promise.resolve(null);
        }

        const processId = this.bpDataService.processMetadata.processId;
        return this.bpeService.getOriginalOrderForProcess(processId)
    }

    private initWithCatalogueLine(line: CatalogueLine, settings: CompanySettings) {
        this.wrapper = new ProductWrapper(line, settings.negotiationSettings);
        this.bpDataService.setCatalogueLines([line], [settings]);
        this.settings = settings;
        this.bpDataService.computeWorkflowOptions();
        this.options = this.bpDataService.workflowOptions;
        if(this.processType) {
            this.currentStep = this.getCurrentStep(this.processType);
        }
        this.stepsDisplayMode = this.getStepsDisplayMode();
    }

    private getCurrentStep(processType: ProcessType): ProductBpStep {
        switch(processType) {
            case "Item_Information_Request":
                if(isTransportService(this.line)) {
                    return "Transport_Information_Request";
                } else {
                    return "Item_Information_Request";
                }
            case "Ppap":
                return "Ppap";
            case "Negotiation":
                if(isTransportService(this.line)) {
                    return "Transport_Negotiation";
                } else {
                    return "Negotiation";
                }
            case "Fulfilment":
                return "Fulfilment";
            case "Transport_Execution_Plan":
                return this.isOrderDone() ? "Transport_Order_Confirmed" : "Transport_Order";
            case "Order":
                if(isTransportService(this.line)) {
                    return this.isOrderDone() ? "Transport_Order_Confirmed" : "Transport_Order";
                } else {
                    return this.isOrderDone() ? "Order_Confirmed" : "Order";
                }
        }
    }

    private getStepsDisplayMode(): ProductBpStepsDisplay {
        if(this.serviceLine) {
            if(this.bpDataService.userRole === "seller") {
                // The service provider only sees transport steps
                return "Transport";
            } else if(!this.originalOrder) {
                // No original order: this is just a transport order without previous order from the customer
                return "Transport";
            } else {
                return "Transport_After_Order";
            }
        } else {
            if(this.bpDataService.userRole === "seller") {
                return "Order_Before_Transport";
            } else {
                return "Order";
            }
        }
    }

    private getReferencedCatalogueLine(line: CatalogueLine, order: Order): Promise<CatalogueLine> {
        if(!this.hasReferencedCatalogueLine(line, order)) {
            return Promise.resolve(null);
        }

        const item = order.orderLine[0].lineItem.item;
        const catalogueId = item.catalogueDocumentReference.id;
        const lineId = item.manufacturersItemIdentification.id;

        return this.catalogueService.getCatalogueLine(catalogueId, lineId)
    }

    private hasReferencedCatalogueLine(line: CatalogueLine, order: Order): boolean {
        if(!order) {
            return false;
        }

        const orderItem = order.orderLine[0].lineItem.item;
        const orderCatalogueId = orderItem.catalogueDocumentReference.id;
        const orderLineId = orderItem.manufacturersItemIdentification.id;

        const item = line.goodsItem.item;
        const catalogueId = item.catalogueDocumentReference.id;
        const lineId = item.manufacturersItemIdentification.id;

        return orderCatalogueId !== catalogueId || orderLineId !== lineId;
    }


}
