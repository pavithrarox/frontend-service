import { Item } from "./item";
import { ThreadEventStatus } from "./thread-event-status";
import { ProcessType } from "../../../bpe/model/process-type";

// TODO move this class to an appropriate package under BP directory
export class ThreadEventMetadata {
    constructor(
        public processType: ProcessType,
        public presentableProcessType: string,
        public processInstanceId: string,
        public startTime: string,
        public tradingPartner: string,
        public products: Item[],
        public correspondent: string,
        public processStatus: string,
        public content: any,
        public activityVariables: any,
        public buyer: boolean,
        public isRated: boolean,
        public areProductsDeleted : boolean[],
        public isCollaborationFinished: boolean,
        public isBeingUpdated: boolean = false, // It's true only while the process instance is being updated.
        public status?: ThreadEventStatus,
        public statusText?: string,
        public actionText?: string,
        public formerStep?: boolean
    ) {}
}
