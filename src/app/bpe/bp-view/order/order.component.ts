import {ChangeDetectorRef, Component, Input, OnInit} from "@angular/core";
import {Order} from "../../../catalogue/model/publish/order";
import { CallStatus } from "../../../common/call-status";
import { BPDataService } from "../bp-data-service";
import { LineItem } from "../../../catalogue/model/publish/line-item";

/**
 * Created by suat on 20-Sep-17.
 */
@Component({
    selector: "order",
    templateUrl: "./order.component.html",
    styleUrls: ["./order.component.css"]
})
export class OrderComponent implements OnInit {
    
    order: Order;

    showPreview: boolean = false;

    callStatus: CallStatus = new CallStatus();

    constructor(private bpDataService: BPDataService) {

    }

    ngOnInit(): void {
        if(this.bpDataService.order == null) {
            // initiating a new business process from scratch
            this.callStatus.submit();
            this.bpDataService.initOrder().then(() => {
                this.callStatus.callback("Order initialized", true);
                this.order = this.bpDataService.order;
            }).catch(error => {
                this.callStatus.error("Error while initializing order.");
                console.log("Error while initializing order", error);
            })
        }
    }

    isLoading(): boolean {
        return false;
    }

    getDeliveryPeriodText(): string {
        const qty = this.getLineItem().delivery[0].requestedDeliveryPeriod.durationMeasure;
        return `${qty.value} ${qty.unitCode}`;
    }

    getWarrantyPeriodText(): string {
        const warranty = this.getLineItem().warrantyValidityPeriod.durationMeasure;
        if(!warranty || !warranty.unitCode || !warranty.value) {
            return "None";
        }
        return `${warranty.value} ${warranty.unitCode}`;
    }

    getIncoterm(): string {
        return this.getLineItem().deliveryTerms.incoterms;
    }

    getLineItem(): LineItem {
        return this.order.orderLine[0].lineItem;
    }

    onBack() {

    }

    onOrder() {
        
    }
}
