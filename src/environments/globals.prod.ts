'use strict';

// Development variables

export const debug = false;


// Base path variables

export const base_path = "https://nimble-platform.salzburgresearch.at/nimble";
export const ub_base = "https://nimble-platform.salzburgresearch.at/ub-search";
export const idpURL = "https://nimble-platform.salzburgresearch.at:8080/auth/realms/master";
export const collab_path = "http://nimble.eu-de.containers.appdomain.cloud/collaborations";
export const pw_reset_link = idpURL + "/login-actions/reset-credentials?client_id=nimble_client";
export const frontendURL = base_path + "/frontend/";

// Service endpoints

export const user_mgmt_endpoint=`${base_path}/identity`;
export const catalogue_endpoint=`${base_path}/catalog`;
export const bpe_endpoint=`${base_path}/business-process`;
export const data_channel_endpoint=`${base_path}/data-channel`;
export const data_aggregation_endpoint=`${base_path}/data-aggregation`;
export const trust_service_endpoint=`${base_path}/trust`;
export const indexing_service_endpoint=`${base_path}/index`;
export const rocketChatEndpoint = `${base_path}:3000`;
export const logstash_endpoint = `${base_path}/logstash`;
export const kibana_endpoint = `${base_path}/kibana/app/kibana`;
export const delegate_endpoint = `${base_path}:9265`;
export const collaboration_endpoint = `${collab_path}`;


// BIBA endpoints

export const languageEndPoint = `${ub_base}/getSupportedLanguages`;
export const endpoint = `${ub_base}/detectMeaningLanguageSpecific`;
export const logicalViewEndpoint = `${ub_base}/getLogicalView`;
export const propertyEndPoint = `${ub_base}/getPropertyValuesDiscretised`;
export const sparqlEndPoint = `${ub_base}/executeSPARQLSelect`;
export const sparqlOptionalSelectEndPoint = `${ub_base}/executeSPARQLOptionalSelect`;
export const spqButton = `${ub_base}/getSQPFromOrangeGroup`;
export const obs_propFromConcept = `${ub_base}/getPropertyFromConcept`;
export const obs_propValueFromConcept = `${ub_base}/getPropertyValuesFromGreenGroup`;
export const referenceFromConcept = `${ub_base}/getReferencesFromAConcept`;
export const sqpOrangeConcept = `${ub_base}/getPropertyValuesFromOrangeGroup`;


// TnT Endpoints

export const tntEndpoint = `${base_path}/tracking`;
export const tntMasterDataEndpoint = `${base_path}/tracking/masterData/id/`;
export const tntAnalysisEndpoint = `${base_path}/tracking-analysis/`;
export const tntIoTBlockchainEndpoint = `${base_path}/iot-bc-api/api/verify`;


// Platform Configuration

export const config = {
  "platformName": "MVP",
  "companyRegistrationRequired": false,
  "categoryFilter": {
    "eClass": {
      "hiddenCategories": [],
      "logisticsCategory": "14000000",
      "ontologyPrefix": "http://www.nimble-project.org/resource/eclass#"
    },
    "FurnitureOntology": {
      "hiddenCategories": ["Catalogue","Company","ContactPerson","Guarantee","Price","Process","Standard","Style","Technique"],
      "logisticsCategory": "LogisticsService",
      "ontologyPrefix": "http://www.aidimme.es/FurnitureSectorOntology.owl#"
    }
  },
  "collaborationEnabled": false,
  "dataChannelsEnabled" : true,
  "defaultBusinessProcessIds": [
  ],
  "defaultSearchIndex": "Name",
  "delegationEnabled": false,
  "frameContractTabEnabled":true,
  "imprint": "<u>Platform Owner & Provider</u><br/><b>Salzburg Research Forschungsgesellschaft m.b.H.</b><br/>Jakob Haringer Straße 5/3<br/>5020 Salzburg, Austria<br/>Phone: +43.662.2288.200<br/>Fax: +43.662.2288.222<br/>E-Mail: <a href='mailto:info@salzburgresearch.at'>info@salzburgresearch.at</a><br/>Internet: <a href='https://www.salzburgresearch.at' target='_blank'>www.salzburgresearch.at</a><br/>Managing Director: Siegfried Reich<br/>Registry Number: LG Salzburg (FN 149016 t)<br/>UID: ATU 41145408<br/>Content Officer: Siegfried Reich<br/>Owner: State of Salzburg (100%)",
  "kibanaConfig": {
    "companyDashboards": [],
    "companyGraphs": [],
    "dashboards": []
  },
  "kibanaEnabled": false,
  "languageSettings": {
    "available": ["en", "es", "de", "tr", "it", "sv"],
    "fallback": "en"
  },
  "loggingEnabled": true,
  "logoPath": "./assets/logo_mvp.png",
  "federationLogoPath": "./assets/logo_mvp_efactory.png",
  "logoRequired": false,
  "phoneNumberRequired": false,
  "vatEnabled": true,
  "projectsEnabled": true,
  "requiredAgreements": [
    {
      "title":"End-User License Agreement (EULA)",
      "src":"./assets/eula.pdf"
    }
  ],
  "showChat": false,
  "showCompanyMembers": false,
  "showExplorative": true,
  "showLCPA": true,
  "showPPAP": true,
  "showTrack": true,
  "showTrade": true,
  "showVerification": true,
  "standardCurrency": "EUR",
  "standardTaxonomy": "All",
  "supportedActivitySectors": {
  	"": [],
  	"Logistics Provider": [],
  	"Manufacturer": [],
  	"Service Provider": [],
  	"Other": []
  },
  "supportedBusinessTypes": [
  	"",
  	"Logistics Provider",
  	"Manufacturer",
  	"Service Provider",
  	"Other"
  ],
  "supportedCertificates": [
      "Appearance Approval Report",
      "Checking Aids",
      "Control Plan",
      "Customer Engineering Approval",
      "Customer Specific Requirements",
      "Design Documentation",
      "Design Failure Mode and Effects Analysis",
      "Dimensional Results",
      "Engineering Change Documentation",
      "Initial Process Studies",
      "Master Sample",
      "Measurement System Analysis Studies",
      "Part Submission Warrant",
      "Process Failure Mode and Effects Analysis",
      "Process Flow Diagram",
      "Qualified Laboratory Documentation",
      "Records of Material / Performance Tests",
      "Sample Production Parts",
      "Other"
  ],
  "supportedRoles": [
      "company_admin",
      "external_representative",
      "legal_representative",
      "monitor",
      "publisher",
      "purchaser",
      "sales_officer"
  ],
  "supportMail": "nimble-support@salzburgresearch.at",
  "supportMailContent": {
    "en":"Dear NIMBLE support team,\n\n\nI have encountered an issue.\n\nDescription of the issue:\n[Please insert a detailed description of the issue here. Add some screenshots as an attachement if they are of use.]",
    "es":"Equipo de soporte NIMBLE,\n\n\nHe detectado una incidencia.\n\nDescripción:\n[Por favor indique a continuación los detalles de la incidencia. Si es posible incluya alguna captura de pantalla si puede ser de utilidad.]"
  },
  "showLoginFederation": false,
  "unshippedOrdersTabEnabled":true,
  "federationClientID": "sample-client",
  "federationIDP": "sampleIDP"
};


// Catalogue format variables

export const product_vendor = "manufacturer";
export const product_vendor_id = "id";
export const product_vendor_img = "logoId";
export const product_vendor_name = "legalName";
export const product_vendor_brand_name = "brandName";
export const product_vendor_rating = "trustRating";
export const product_vendor_rating_seller = "trustSellerCommunication";
export const product_vendor_rating_fulfillment = "trustFullfillmentOfTerms";
export const product_vendor_rating_delivery = "trustDeliveryPackaging";
export const product_vendor_trust = "trustScore";
export const product_name = "label";
export const class_label = "classification.allLabels";
export const product_description = "description";
export const product_img = "imgageUri";
export const product_price = "price";
export const product_currency = "currency";
export const product_cat = "classificationUri";
export const product_cat_mix = "commodityClassficationUri";
export const product_filter_prod = ["freeOfCharge","certificateType","applicableCountries"];
export const product_filter_comp = ["manufacturer.legalName","manufacturer.brandName","manufacturer.businessType","manufacturer.activitySectors","manufacturer.businessKeywords","manufacturer.origin","manufacturer.certificateType","manufacturer.ppapComplianceLevel","manufacturer.ppapDocumentType"];
export const party_facet_field_list = ["legalName","{LANG}_brandName","businessType","{LANG}_activitySectors","{LANG}_businessKeywords","{LANG}_origin","{LANG}_certificateType","ppapComplianceLevel","ppapDocumentType"];
export const party_filter_main = ["businessType","activitySectors","businessKeywords","origin","certificateType","ppapComplianceLevel","ppapDocumentType"];
export const party_filter_trust = ["trustScore","trustRating","trustSellerCommunication","trustFullfillmentOfTerms","trustDeliveryPackaging","trustNumberOfTransactions"];
export const item_manufacturer_id = "manufacturerId";
export const product_filter_trust = ["manufacturer.trustScore","manufacturer.trustRating","manufacturer.trustSellerCommunication","manufacturer.trustFullfillmentOfTerms","manufacturer.trustDeliveryPackaging","manufacturer.trustNumberOfTransactions"];
export const product_filter_mappings = {
  "price": "Price",
  "currency": "Currency",
  "manufacturer.businessType": "Business Type",
  "manufacturer.activitySectors": "Activity Sectors",
  "manufacturer.businessKeywords": "Business Keywords",
  "businessType": "Business Type",
  "activitySectors": "Activity Sectors",
  "businessKeywords": "Business Keywords"
};
export const product_nonfilter_full = ["_text_","_version_","id","image","localName","languages","catalogueId","doctype","manufacturerId","manufacturerItemId","allLabels"];
export const product_nonfilter_regex = ["lmf.","_id", "_txt", "_desc", "_label", "_key", "_price", "_currency", "httpwwwnimbleprojectorgresourceeclasshttpwwwnimbleprojectorgresourceeclasshttpwwwnimbleprojectorgresourceeclasshttpwwwnimbleprojectorgresourceeclass"];
export const product_configurable = [];
export const product_default = {};
export const facet_min = 1;
export const facet_count = -1;
export const query_settings = {
  "fields": ["STANDARD","commodityClassficationUri","{LANG}_label","{LANG}_desc"],
  "boosting": true,
  "boostingFactors": {
    "STANDARD": 4,
    "commodityClassficationUri": 16,
    "{LANG}_label": 64,
    "{LANG}_desc": -1
  }
};
export const query_settings_comp = {
  "fields": ["STANDARD","legalName","{LANG}_brandName"],
  "boosting": true,
  "boostingFactors": {
    "STANDARD": 4,
    "{LANG}_brandName": 64,
    "legalName": 64
  }
};
