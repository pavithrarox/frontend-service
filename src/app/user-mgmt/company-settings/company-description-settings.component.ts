import { Component, OnInit, Input, EventEmitter, Output } from "@angular/core";
import { CallStatus } from "../../common/call-status";
import { FormGroup, FormBuilder, FormArray } from "@angular/forms";
import { CompanySettings } from "../model/company-settings";
import { CompanyEvent } from "../model/company-event";
import { Address } from "../model/address";
import { AddressSubForm } from '../subforms/address.component';
import * as moment from "moment";
import * as myGlobals from "../../globals";
import { CookieService } from "ng2-cookies";
import { UserService } from "../user.service";
import { AppComponent } from "../../app.component";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";

@Component({
    selector: "company-description-settings",
    templateUrl: "./company-description-settings.component.html"
})
export class CompanyDescriptionSettingsComponent implements OnInit {

    @Input() settings: CompanySettings;
    descriptionForm: FormGroup;
    socialMediaList = [""];
    compEvents:CompanyEvent[] = [];
    socialMediaListChanged = false;
    compEventsChanged = false;
    imgEndpoint = myGlobals.user_mgmt_endpoint+"/company-settings/image/";
    addEventForm: FormGroup;
    addImageForm: FormGroup;
    imgFile = null;
    compEventFromDate = new Date().toISOString();
    compEventToDate = new Date().toISOString();
    saveCallStatus: CallStatus = new CallStatus();
    saveCallStatusImage: CallStatus = new CallStatus();
    @Output() onSaveEvent: EventEmitter<void> = new EventEmitter();

    constructor(private appComponent: AppComponent,
                private modalService: NgbModal,
                private _fb: FormBuilder,
                private cookieService: CookieService,
                private userService: UserService) {

    }

    ngOnInit() {
      this.descriptionForm = this._fb.group({
          companyStatement: this.settings.description.companyStatement,
          website: this.settings.description.website
      });
      this.socialMediaList = this.settings.description.socialMediaList;
      if (this.socialMediaList.length == 0)
        this.socialMediaList = [""];
      this.compEvents = this.settings.description.events;
      this.normalizeDates();
      this.sortCompEvent();
    }

    addSocialMediaEntry() {
      this.socialMediaList.push("");
      this.flagSocialMediaChanged();
    }

    addCompEventEntry(content) {
        this.compEventFromDate = new Date().toISOString();
        this.compEventToDate = new Date().toISOString();
        this.addEventForm = this._fb.group({
            name: [""],
            description: [""],
            place: AddressSubForm.generateForm(this._fb)
        });
        this.modalService.open(content);
    }

    onSaveEventEntry(model: FormGroup, close: any) {
        const fields = model.getRawValue();
        let newEvent = new CompanyEvent(
          new Date(this.compEventFromDate).toISOString(),
          new Date(this.compEventToDate).toISOString(),
          fields.description,
          fields.name,
          fields.place
        );
        this.compEvents.push(newEvent);
        this.sortCompEvent();
        close();
        this.flagCompEventsChanged();
    }

    normalizeDates() {
      for (var i=0; i<this.compEvents.length; i++) {
        this.compEvents[i].dateFrom = new Date(this.compEvents[i].dateFrom).toISOString();
        this.compEvents[i].dateTo = new Date(this.compEvents[i].dateTo).toISOString();
      }
    }

    sortCompEvent() {
      this.compEvents.sort((a,b)=>moment(a.dateFrom).diff(moment(b.dateFrom)));
    }

    removeSocialMediaEntry(index:number){
      this.socialMediaList.splice(index,1);
      if (this.socialMediaList.length == 0)
        this.socialMediaList = [""];
      this.flagSocialMediaChanged();
    }

    removeCompEventEntry(index:number) {
      this.compEvents.splice(index,1);
      this.flagCompEventsChanged();
    }

    flagSocialMediaChanged() {
      this.socialMediaListChanged = true;
    }

    flagCompEventsChanged() {
      this.compEventsChanged = true;
    }

    formatDate(date:string) {
      return moment(date).format("YYYY-MM-DD");
    }

    trackFn(index,item) {
      return index;
    }

    addImage(content, logo) {
      this.addImageForm = this._fb.group({
          file: [""],
          isLogo: logo
      });
      this.modalService.open(content);
    }

    onSetImageFile(event: any) {
        let fileList: FileList = event.target.files;
        if (fileList.length > 0) {
            let file: File = fileList[0];
            if(file) {
                const filesize = parseInt(((file.size/1024)/1024).toFixed(4));
                if (filesize < 2) {
                  this.imgFile = file;
                }
                else {
                  this.imgFile = null;
                  alert("Maximum allowed filesize: 2 MB");
                }
            }
        } else {
            this.imgFile = null;
        }
    }

    onSaveImage(model: FormGroup, close: any) {
        this.saveCallStatusImage.submit();
        const fields = model.getRawValue();
        this.userService
            .saveImage(this.imgFile, fields.isLogo)
            .then(() => {
                close();
                this.saveCallStatusImage.callback("Image saved", true);
                this.onSaveEvent.emit();
            })
            .catch(error => {
                this.saveCallStatusImage.error("Error while saving image", error);
            });
    }

    onDeleteImage(id) {
      if (confirm("Are you sure that you want to delete this image?")) {
        this.saveCallStatusImage.submit();
        this.userService
          .deleteImage(id)
          .then(() => {
              this.saveCallStatusImage.callback("Image deleted", true);
              this.onSaveEvent.emit();
          })
          .catch(error => {
              this.saveCallStatusImage.error("Error while deleting image", error);
          });
      }
    }

    onSave(model: FormGroup) {
        this.saveCallStatus.submit();
        this.settings.description.companyStatement =  model.getRawValue()['companyStatement'];
        this.settings.description.website = model.getRawValue()['website'];
        this.settings.description.socialMediaList = this.socialMediaList;
        this.settings.description.events = this.compEvents;
        let userId = this.cookieService.get("user_id");
        this.userService
            .putSettings(this.settings, userId)
            .then(response => {
                if (myGlobals.debug) {
                    console.log(`Saved Company Settings for user ${userId}. Response: ${response}`);
                }
                this.saveCallStatus.callback("Successfully saved", true);
                this.socialMediaListChanged = false;
                this.compEventsChanged = false;
                this.descriptionForm.markAsPristine();
                this.onSaveEvent.emit();
            })
            .catch(error => {
                this.saveCallStatus.error("Error while saving company settings", error);
            });
    }

}