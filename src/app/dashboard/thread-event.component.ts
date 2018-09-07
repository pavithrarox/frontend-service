import {Component, OnInit, Input, Output, EventEmitter} from "@angular/core";
import { Router } from "@angular/router";
import { BPDataService } from "../bpe/bp-view/bp-data-service";
import { ActivityVariableParser } from "../bpe/bp-view/activity-variable-parser";
import { ProcessInstanceGroup } from "../bpe/model/process-instance-group";
import { ThreadEventMetadata } from "../catalogue/model/publish/thread-event-metadata";
import {BPEService} from "../bpe/bpe.service";

@Component({
    selector: "thread-event",
    templateUrl: "./thread-event.component.html",
    styleUrls: ["./thread-event.component.css"]
})
export class ThreadEventComponent implements OnInit {

    @Input() processInstanceGroup: ProcessInstanceGroup;
    @Input() event: ThreadEventMetadata;
    @Output() processCancelled = new EventEmitter();

    constructor(private bpDataService: BPDataService,
                private bpeService: BPEService,
                private router: Router) {
    }

    ngOnInit() {

    }

    openBpProcessView(updateProcess:boolean) {
        let role = ActivityVariableParser.getUserRole(this.event.activityVariables,this.processInstanceGroup.partyID);
        this.bpDataService.setBpOptionParametersWithProcessMetadata(role, this.event.processType, this.event, updateProcess);
        this.bpDataService.setRelatedGroupId(this.processInstanceGroup.id);
        this.router.navigate(['bpe/bpe-exec'], {
            queryParams: {
                catalogueId: this.event.product.catalogueDocumentReference.id,
                id: this.event.product.manufacturersItemIdentification.id,
                pid: this.event.processId
            }
        });
    }

    cancelBP(){
        if (confirm("Are you sure that you want to cancel this process?")){
            this.bpeService.cancelBusinessProcess(this.event.processId)
                .then(res => {
                    this.processCancelled.next();
                })
                .catch(error => {
                    console.error(error);
                });
        }
    }
}