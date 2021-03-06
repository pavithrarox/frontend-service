import {Injectable} from '@angular/core';
import {Headers, Http} from '@angular/http';
import 'rxjs/add/operator/toPromise';
import * as myGlobals from '../globals';
import {ProcessInstance} from "./model/process-instance";
import {BPDataService} from "./bp-view/bp-data-service";
import {CollaborationGroupResponse} from "./model/process-instance-group-response";
import {ProcessInstanceGroupFilter} from "./model/process-instance-group-filter";
import {CookieService} from "ng2-cookies";
import {Contract} from "../catalogue/model/publish/contract";
import {Clause} from "../catalogue/model/publish/clause";
import { CollaborationRole } from "./model/collaboration-role";
import { Order } from '../catalogue/model/publish/order';
import { EvidenceSupplied } from '../catalogue/model/publish/evidence-supplied';
import { Comment } from '../catalogue/model/publish/comment';
import {SearchContextService} from '../simple-search/search-context.service';
import {DashboardProcessInstanceDetails} from './model/dashboard-process-instance-details';
import {DigitalAgreement} from "../catalogue/model/publish/digital-agreement";
import {CollaborationGroup} from "./model/collaboration-group";
import {DocumentReference} from '../catalogue/model/publish/document-reference';
import {UBLModelUtils} from "../catalogue/model/ubl-model-utils";

@Injectable()
export class BPEService {

	private headers = new Headers({'Content-Type': 'application/json'});
	private url = myGlobals.bpe_endpoint;

	constructor(private http: Http,
				private bpDataService:BPDataService,
                private searchContextService: SearchContextService,
				private cookieService: CookieService) { }

    startProcessWithDocument(document:any):Promise<ProcessInstance> {
        const headers = this.getAuthorizedHeaders();
        let url = `${this.url}/process-document`;

        // create a DocumentReference for the previous document
        if(this.bpDataService.precedingDocumentId){
            let documentRef:DocumentReference = new DocumentReference();
            documentRef.id = this.bpDataService.precedingDocumentId;
            documentRef.documentType = "previousDocument";
            document.additionalDocumentReference.push(documentRef);
        }
        // create a DocumentReference for the previous order
        if(this.searchContextService.getPrecedingOrderId()){
            let documentRef:DocumentReference = new DocumentReference();
            documentRef.id = this.searchContextService.getPrecedingOrderId();
            documentRef.documentType = "previousOrder";

            document.additionalDocumentReference.push(documentRef);
        }

		UBLModelUtils.removeHjidFieldsFromObject(document);
        return this.http
            .post(url, JSON.stringify(document), {headers: headers})
            .toPromise()
            .then(res => {
				if (myGlobals.debug)
					console.log(res.json());
				return res.json();
			})
            .catch(this.handleError);
	}

	cancelBusinessProcess(id: string): Promise<any> {
	    let headers = this.getAuthorizedHeaders();
		const url = `${this.url}/processInstance/${id}/cancel`;
		return this.http
		.post(url, null, {headers: headers})
		.toPromise()
		.then(res => res.text())
		.catch(this.handleError);
	}

    cancelCollaboration(groupId: string): Promise<any> {
        let headers = this.getAuthorizedHeaders();
        const url = `${this.url}/process-instance-groups/${groupId}/cancel`;
        return this.http
            .post(url, null, {headers: headers})
            .toPromise()
            .then(res => res.text())
            .catch(this.handleError);
    }

    finishCollaboration(groupId: string): Promise<any> {
        let headers = this.getAuthorizedHeaders();
        const url = `${this.url}/process-instance-groups/${groupId}/finish`;
        return this.http
            .post(url, null, {headers: headers})
            .toPromise()
            .then(res => res.text())
            .catch(this.handleError);
    }

    updateBusinessProcess(content: string, processID: string, processInstanceID: string): Promise<any> {
        const url = `${this.url}/processInstance?processID=${processID}&processInstanceID=${processInstanceID}&creatorUserID=${this.cookieService.get("user_id")}`;
        return this.http
            .patch(url, content,{headers: this.getAuthorizedHeaders()})
            .toPromise()
            .then(res => res.text())
            .catch(this.handleError);
	}

	getProcessInstanceGroup(groupId: string){
		let url:string = `${this.url}/process-instance-groups/${groupId}`;
		return this.http
            .get(url, {headers: this.getAuthorizedHeaders()})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
	}

	getProcessDetailsHistory(id: string): Promise<any> {
		const url = `${this.url}/rest/engine/default/history/variable-instance?processInstanceIdIn=${id}`;
		return this.http
		.get(url, {headers: this.headers})
		.toPromise()
		.then(res => res.json())
		.catch(this.handleError);
	}

	getActionRequiredCounter(companyId: string): Promise<any> {
			return Promise.all([
					this.getActionRequiredBuyer(companyId),
					this.getActionRequiredSeller(companyId)
			]).then(([buyer, seller]) => {
					return {"buyer":buyer,"seller":seller};
			})
	}

	getActionRequiredBuyer(partyId: string): Promise<any> {
		const url = `${this.url}/statistics/total-number/business-process/action-required?archived=false&role=buyer&partyId=${partyId}`;
		return this.http
            .get(url, {headers: this.getAuthorizedHeaders()})
            .toPromise()
            .then(res => res.text())
            .catch(this.handleError);
	}

	getActionRequiredSeller(partyId: string): Promise<any> {
		const url = `${this.url}/statistics/total-number/business-process/action-required?archived=false&role=seller&partyId=${partyId}`;
		return this.http
            .get(url, {headers: this.getAuthorizedHeaders()})
            .toPromise()
            .then(res => res.text())
            .catch(this.handleError);
	}

	getLastActivityForProcessInstance(processInstanceId: string): Promise<any> {
		const url = `${this.url}/rest/engine/default/history/activity-instance?processInstanceId=${processInstanceId}&sortBy=startTime&sortOrder=desc&maxResults=1`;
		return this.http
            .get(url, {headers: this.headers})
            .toPromise()
            .then(res => res.json()[0])
            .catch(this.handleError);
	}

	getFulfilmentStatistics(orderId: string): Promise<any> {
		const url = `${this.url}/statistics/fulfilment?orderId=${orderId}`;
		return this.http
			.get(url, {headers: this.getAuthorizedHeaders()})
			.toPromise()
			.then(res => res.json())
			.catch(this.handleError);
	}

	getProcessInstanceGroupFilters(partyId:string, collaborationRole: CollaborationRole, archived: boolean, products: string[],
		categories: string[], partners: string[],status: string[],isProject:boolean): Promise<ProcessInstanceGroupFilter> {
		const headers = this.getAuthorizedHeaders();

		let url: string = `${this.url}/process-instance-groups/filters?partyId=${partyId}&collaborationRole=${collaborationRole}&archived=${archived}`;
		if(products.length > 0) {
			url += '&relatedProducts=' + this.stringifyArray(products);
		}
		if(categories.length > 0) {
			url += '&relatedProductCategories=' + this.stringifyArray(categories);
		}
		if(partners.length > 0) {
			url += '&tradingPartnerIDs=' + this.stringifyArray(partners);
		}
		if(status.length > 0){
			url += '&status='+this.stringifyArray(status);
		}
		if(isProject){
		    url += '&isProject='+isProject;
		}
		return this.http
            .get(url, {headers: headers})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
	}

	getCollaborationGroups(partyId:string, collaborationRole: CollaborationRole, page: number, limit: number, archived: boolean, products: string[], categories: string[], partners: string[], status: string[], isProject?:boolean): Promise<CollaborationGroupResponse> {
		let offset:number = page * limit;
		let url:string = `${this.url}/collaboration-groups?partyId=${partyId}&collaborationRole=${collaborationRole}&offset=${offset}&limit=${limit}&archived=${archived}`;
		if(products.length > 0) {
			url += '&relatedProducts=' + this.stringifyArray(products);
		}
		if(categories.length > 0) {
			url += '&relatedProductCategories=' + this.stringifyArray(categories);
		}
		if(partners.length > 0) {
			url += '&tradingPartnerIDs=' + this.stringifyArray(partners);
		}
		if(status.length > 0){
		    url += '&status='+this.stringifyArray(status);
		}

		if(isProject){
		    url += '&isProject='+isProject;
		}

		return this.http
            .get(url, {headers: this.getAuthorizedHeaders()})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
	}

	getGroupDetailsForProcessInstance(processInstanceId: string): Promise<CollaborationGroup> {
		let url:string = `${this.url}/processInstance/${processInstanceId}/collaboration-group`;
		return this.http
            .get(url, {headers: this.getAuthorizedHeaders()})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
	}

	paymentDone(orderId: string): Promise<any> {
		let headers = this.getAuthorizedHeaders();
		const url = `${this.url}/paymentDone/${orderId}`;
		return this.http
			.post(url, null, {headers: headers})
			.toPromise()
			.then(res => res.text())
			.catch(this.handleError);
	}

	isPaymentDone(orderId: string): Promise<any> {
		let headers = this.getAuthorizedHeaders();
		const url = `${this.url}/paymentDone/${orderId}`;
		return this.http
			.get(url,  {headers: headers})
			.toPromise()
			.then(res => res.text())
			.catch(this.handleError);
	}

	getDashboardProcessInstanceDetails(processInstanceId:string): Promise<DashboardProcessInstanceDetails>{
        let url:string = `${this.url}/processInstance/${processInstanceId}/details`;
        return this.http
            .get(url, {headers: this.getAuthorizedHeaders()})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
	}

	deleteProcessInstanceGroup(groupId: string) {
        const token = 'Bearer '+this.cookieService.get("bearer_token");
		const url = `${this.url}/process-instance-groups/${groupId}`;
		return this.http
            .delete(url,{headers:new Headers({"Authorization":token})})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
	}

	updateCollaborationGroupName(groupId:string,groupName:string){
        const token = 'Bearer '+this.cookieService.get("bearer_token");
        const url = `${this.url}/collaboration-groups/${groupId}?groupName=${groupName}`;
        return this.http
            .patch(url,null,{headers:new Headers({"Authorization":token})})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
    }

    deleteCollaborationGroup(groupId: string) {
        const token = 'Bearer '+this.cookieService.get("bearer_token");
        const url = `${this.url}/collaboration-groups/${groupId}`;
        return this.http
            .delete(url,{headers:new Headers({"Authorization":token})})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
    }

	archiveCollaborationGroup(groupId: string){
        const token = 'Bearer '+this.cookieService.get("bearer_token");
        const url = `${this.url}/collaboration-groups/${groupId}/archive`;
        return this.http
            .post(url, null,{headers:new Headers({"Authorization":token})})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
	}

    restoreCollaborationGroup(groupId: string) {
        const token = 'Bearer '+this.cookieService.get("bearer_token");
	    const url = `${this.url}/collaboration-groups/${groupId}/restore`;
        return this.http
            .post(url, null,{headers:new Headers({"Authorization":token})})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
}

	constructContractForProcess(processInstancesId: string): Promise<Contract> {
		const url = `${this.url}/contracts?processInstanceId=${processInstancesId}`;
		return this.http
            .get(url, {headers: this.getAuthorizedHeaders()})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
	}

	downloadContractBundle(id: string): Promise<any> {
        const token = 'Bearer '+this.cookieService.get("bearer_token");
		const url = `${this.url}/contracts/create-bundle?orderId=${id}`;
        return new Promise<any>((resolve, reject) => {
            let xhr = new XMLHttpRequest();

            xhr.open('GET', url, true);
            xhr.setRequestHeader('Accept', 'application/zip');
            xhr.setRequestHeader("Authorization",token);
            xhr.responseType = 'blob';

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {

                        var contentType = 'application/zip';
                        var blob = new Blob([xhr.response], {type: contentType});
                        resolve({fileName: "Contract Bundle.zip", content: blob});
                    } else {
                        reject(xhr.status);
                    }
                }
            }
            xhr.send();
        });
    }

	getTermsAndConditions(buyerPartyId, sellerPartyId, incoterms:string, tradingTerm:string): Promise<Clause[]>{
		const token = 'Bearer '+this.cookieService.get("bearer_token");
		const headers = new Headers({'Authorization': token});
		this.headers.keys().forEach(header => headers.append(header, this.headers.get(header)));

		let url = `${this.url}/contracts/terms-and-conditions?sellerPartyId=${sellerPartyId}&incoterms=${incoterms == null ? "" :incoterms}`;
        // add parameters
        if(buyerPartyId){
            url += `&buyerPartyId=${buyerPartyId}`;
		}
        if(tradingTerm){
			url += `&tradingTerm=${tradingTerm}`;
		}

		return this.http
			.get(url, {headers: headers})
			.toPromise()
			.then(res => res.json())
			.catch(this.handleError);
	}

	getOriginalOrderForProcess(processId: string): Promise<Order | null> {
		const headers = this.getAuthorizedHeaders();
		const url = `${this.url}/process-instance-groups/order-document?processInstanceId=${processId}`;
		return this.http
            .get(url, { headers })
            .toPromise()
            .then(res => res.json() || null)
            .catch(() => null);
	}

	getRatings(partyId: string): Promise<any> {
		const headers = this.getAuthorizedHeaders();
		const url = `${this.url}/ratingsAndReviews?partyId=${partyId}`;
		return this.http
            .get(url, {headers: headers})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
	}

	getRatingsSummary(partyId: string): Promise<any> {
		const headers = this.getAuthorizedHeaders();
		const url = `${this.url}/ratingsSummary?partyId=${partyId}`;
		return this.http
            .get(url, {headers: headers})
            .toPromise()
            .then(res => res.json())
            .catch(res => {
                if (res.status == 400) {
                    // no ratings
                    return null;
                } else {
                    this.handleError(res.getBody());
                }
            });
    }

	postRatings(partyId: string, processInstanceId: string, ratings: EvidenceSupplied[], reviews: Comment[]): Promise<any> {
		const headers = this.getAuthorizedHeaders();
		const url = `${this.url}/ratingsAndReviews?partyId=${partyId}&processInstanceID=${processInstanceId}&ratings=${encodeURIComponent(JSON.stringify(ratings))}&reviews=${encodeURIComponent(JSON.stringify(reviews))}`;
		return this.http
            .post(url, null, {headers: headers})
            .toPromise()
            .then(res => res)
            .catch(this.handleError);
	}

	ratingExists(processInstanceId: string, partyId: string): Promise<any> {
		const token = 'Bearer '+this.cookieService.get("bearer_token");
		const headers = new Headers({'Accept': 'text/plain','Authorization': token});
		let url: string = `${this.url}/processInstance/${processInstanceId}/isRated?partyId=${partyId}`;
		return this.http
            .get(url, {headers: headers})
            .toPromise()
            .then(res => res.text())
            .catch(this.handleError);
	}

	getFrameContract(sellerId: string, buyerId: string, productIds: string[]): Promise<DigitalAgreement> {
		let productIdsParam = "";
		let size = productIds.length;
		for (let i = 0; i < size; i++) {
			productIdsParam += productIds[i];

			if (i != size - 1) {
				productIdsParam += ",";
			}
		}
		const url = `${this.url}/contract/digital-agreement?sellerId=${sellerId}&buyerId=${buyerId}&productIds=${productIds}`;
		return this.http
            .get(url, {headers: this.getAuthorizedHeaders()})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
	}

	getFrameContractByHjid(hjid: number): Promise<DigitalAgreement> {
		const url = `${this.url}/contract/digital-agreement/${hjid}`;
		return this.http
            .get(url, {headers: this.getAuthorizedHeaders()})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
	}

	getAllFrameContractsForParty(partyId: string): Promise<DigitalAgreement[]> {
		const url = `${this.url}/contract/digital-agreement/all?partyId=${partyId}`;
		return this.http
            .get(url, {headers: this.getAuthorizedHeaders()})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
	}

	deleteFrameContract(hjid: number): Promise<DigitalAgreement[]> {
		const url = `${this.url}/contract/digital-agreement/${hjid}`;
		return this.http
			.delete(url, {headers: this.getAuthorizedHeaders()})
			.toPromise()
			.then(res => res.text())
			.catch(this.handleError);
	}

	checkAllCollaborationsFinished(partyId:string){
        const url = `${this.url}/collaboration-groups/all-finished?partyId=${partyId}`;
        return this.http
            .get(url, {headers: this.getAuthorizedHeaders()})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
	}

    checkCollaborationFinished(groupId:string):Promise<any>{
        const url = `${this.url}/process-instance-groups/${groupId}/finished`;
        return this.http
            .get(url, {headers: this.getAuthorizedHeaders()})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
    }

	mergeNegotations(baseId:string , mergeIds) {
		let url = `${this.url}/collaboration-groups/merge`;
		// append catalogue merge ids to the url
		url += "?bcid=" + baseId;
		let size = mergeIds.length;
		for (let i = 0; i < size; i++) {
			if (i == 0) {
				url += "&cgids=";
			}

			url += mergeIds[i];

			if (i != size - 1) {
				url += ",";
			}
		}
		return this.http
            .get(url, {headers: this.getAuthorizedHeaders()})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
	}
	exportTransactions(partyId: string, userId: string, direction: string, archived: boolean): Promise<any> {
		let url = `${this.url}/processInstance/export?partyId=${partyId}`;
		if(userId != null) {
			url += `&userId=${userId}`;
		}
		if(direction != null) {
			url += `&direction=${direction}`;
		}
		if(archived != null) {
			url += `&archived=${archived}`;
		}

		return new Promise<any>((resolve, reject) => {
			const token = 'Bearer '+this.cookieService.get("bearer_token");
			let xhr = new XMLHttpRequest();
			xhr.open('GET', url, true);
			xhr.setRequestHeader('Accept', 'application/zip');
			xhr.setRequestHeader('Accept', 'text/plain');
			xhr.setRequestHeader('Authorization', token);
			xhr.responseType = 'blob';

			xhr.onreadystatechange = function () {
				if (xhr.readyState === 4) {
					if (xhr.status === 200) {

						var contentType = 'application/zip';
						var blob = new Blob([xhr.response], {type: contentType});
						// file name
						let fileName = 'transactions_' + new Date().toString();

						resolve({fileName: fileName, content: blob});
					} else {
						reject(xhr.responseText);
					}


				} else if(xhr.readyState == 2) {
					if(xhr.status == 200) {
						xhr.responseType = "blob";
					} else {
						xhr.responseType = "text";
					}
				}
			};
			xhr.send();
		});
	}

	public getUnshippedOrderIds(partyId: string): Promise<string[]> {
		const url = `${this.url}/documents/unshipped-order-ids?partyId=${partyId}`;
		return this.http
            .get(url, {headers: this.getAuthorizedHeaders()})
            .toPromise()
            .then(res => res.json())
            .catch(this.handleError);
	}

	private getAuthorizedHeaders(): Headers {
		const token = 'Bearer '+this.cookieService.get("bearer_token");
		const headers = new Headers({'Accept': 'application/json','Authorization': token});
		this.headers.keys().forEach(header => headers.append(header, this.headers.get(header)));
		return headers;
	}

	private stringifyArray(values: any[]): string {
		let paramVal: string = '';
		for (let value of values) {
			paramVal += value + ',';
		}
		paramVal = paramVal.substring(0, paramVal.length-1);
		return paramVal;
	}

	private handleError(error: any): Promise<any> {
		if(error.status == 404) {
			// ignore
			return null;
		} else {
			return Promise.reject(error.message || error);
		}
	}
}
