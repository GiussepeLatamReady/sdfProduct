/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for Reverse cancellation                       ||
||                                                              ||
||  File Name: SMC_MX_Reverse_Cancellation_LBRY_V2.1.js         ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.1     Jul 15 2023  LatamReady    Use Script 2.1           ||
\= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @Author master@latamready.com
 **/

define([
    'N/log',
    'N/search',
    'N/runtime',
    'N/translation',
    'N/redirect',
    'N/ui/serverWidget',
    'N/suiteAppInfo',
    'N/url',
    'N/format',
    'N/task',
    'N/config',
    'SuiteBundles/Bundle 37714/Latam_Library/LMRY_libSendingEmailsLBRY_V2.0'
], function (log, search, runtime, translation, redirect, serverWidget, suiteAppInfo, url, format, task, config, LibraryMail) {
    const LMRY_script = 'SMC - PE WHT Purchase LBRY';
    /* var LANGUAGE = runtime.getCurrentScript().getParameter({ name: "LANGUAGE" });
        LANGUAGE = LANGUAGE.substring(0, 2); */

    var allLicenses = {};
    var licenses = [];
    var subsidiaries = [];
    var anysubsidiary = false;
    var featureLatam = false;

    class LibraryHandler {
        constructor(options) {
            this.params = options.params || {};
            this.method = options.method;
            this.subsidiaries = [];
            this.typesTransaction = this.getTypeTransaction();
            this.FEAT_SUBS = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
            this.FEAT_DPT = runtime.isFeatureInEffect({ feature: 'DEPARTMENTS' });
            this.FEAT_LOC = runtime.isFeatureInEffect({ feature: 'LOCATIONS' });
            this.FEAT_CLASS = runtime.isFeatureInEffect({ feature: 'CLASSES' });
            this.FEAT_MULTIBOOK = runtime.isFeatureInEffect({ feature: 'MULTIBOOK' });
            this.FEAT_INSTALLMENTS = runtime.isFeatureInEffect({ feature: 'INSTALLMENTS' });
            this.FEAT_APPROV_INVC = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALCUSTINVC' });
            this.FEAT_APPROV_BILL = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALVENDORBILL' });
            this.FEAT_APPROV_JOURNAL = runtime.getCurrentScript().getParameter({ name: 'CUSTOMAPPROVALJOURNAL' });

            this.DEPTMANDATORY = runtime.getCurrentUser().getPreference({ name: 'DEPTMANDATORY' });
            this.LOCMANDATORY = runtime.getCurrentUser().getPreference({ name: 'LOCMANDATORY' });
            this.CLASSMANDATORY = runtime.getCurrentUser().getPreference({ name: 'CLASSMANDATORY' });

            this.deploy = runtime.getCurrentScript().deploymentId;
            this.names = this.getNames(this.deploy);
            log.debug('this.names', this.names);

            if (this.method == 'GET') {
                this.translator = this.getTranslator();
                this.licensesBySubsidiary = LibraryMail.getAllLicenses();
            }
        }

        getNames(deploy) {
            let nameList = {
                customdeploy_smc_pe_wht_pur_stlt: {
                    title: 'title_pe_wht_pur',
                    process: 'Individual',
                    scriptid: 'customscript_smc_pe_wht_purchase_mprd',
                    deployid: 'customdeploy_smc_pe_wht_purchase_mprd',
                    paramuser: 'custscript_smc_pe_wht_user',
                    paramstate: 'custscript_smc_pe_wht_state'
                },
                customdeploy_smc_pe_wht_pur_mass_stlt: {
                    title: 'title_pe_wht_pur_mas',
                    process: 'Massive',
                    scriptid: 'customscript_smc_pe_massive_wht_mprd',
                    deployid: 'customdeploy_smc_pe_massive_wht_mprd',
                    paramuser: 'custscript_smc_pe_massive_wht_user',
                    paramstate: 'custscript_smc_pe_massive_wht_state'
                }
            };
            return nameList[deploy];
        }

        areThereSubsidiaries() {
            let subsidiaries = [];
            let anysubsidiary = false;
            let licenses = [];
            if (this.FEAT_SUBS == true || this.FEAT_SUBS == 'T') {
                let allLicenses = LibraryMail.getAllLicenses();
                // log.debug('allLicenses', allLicenses);

                subsidiaries = this.getSubsidiaries();

                for (var i = 0; i < subsidiaries.length; i++) {
                    if (allLicenses[subsidiaries[i].value] != null && allLicenses[subsidiaries[i].value] != '') {
                        licenses = allLicenses[subsidiaries[i].value];
                    } else {
                        licenses = [];
                    }
                    // 20 : Mexico	Basic	Localization
                    if (LibraryMail.getAuthorization(20, licenses)) {
                        subsidiaries[i].active = true;
                        anysubsidiary = true;
                    }
                }
            } else {
                subsidiaries.push({
                    value: 1,
                    text: 'Company',
                    active: false
                });
                licenses = LibraryMail.getLicenses(1);
                // 20 : Mexico	Basic	Localization
                if (LibraryMail.getAuthorization(20, licenses)) {
                    subsidiaries[0].active = true;
                    anysubsidiary = true;
                }
            }

            log.debug('subsidiaries', subsidiaries);
            this.subsidiaries = subsidiaries;
            return anysubsidiary;
        }

        getSubsidiaries() {
            let subsis = [];
            // Solo subsidiaria MX
            let search_Subs = search.create({
                type: search.Type.SUBSIDIARY,
                filters: [['isinactive', 'is', 'F'], 'AND',
                ['country', 'is', 'MX']],
                columns: ['internalid', 'name']
            });
            let lengt_sub = search_Subs.run().getRange(0, 1000);

            if (lengt_sub != null && lengt_sub.length > 0) {
                // Llenado de listbox
                for (let i = 0; i < lengt_sub.length; i++) {
                    let subID = lengt_sub[i].getValue('internalid');
                    let subNM = lengt_sub[i].getValue('name');
                    subsis.push({
                        value: subID,
                        text: subNM,
                        active: false
                    });
                }
            }
            return subsis;
        }

        createForm() {
            log.debug('title_pe_wht_pur', this.getText('title_pe_wht_pur'));
            this.form = serverWidget.createForm({
                title: 'SMC - MX Revertir Cancelacion STLT'
            });

            let form = this.form;

            let anysubsidiary = this.areThereSubsidiaries();

            if (!anysubsidiary) {
                // Mensaje para el cliente
                var myInlineHtml = form.addField({
                    id: 'custpage_lmry_v_message',
                    label: 'Mensaje',
                    type: serverWidget.FieldType.INLINEHTML
                });

                myInlineHtml.updateLayoutType({ layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW });
                myInlineHtml.updateBreakType({
                    breakType: serverWidget.FieldBreakType.STARTCOL
                });

                var strhtml = '<html>';
                strhtml +=
                    '<table border="0" class="table_fields" cellspacing="0" cellpadding="0">' +
                    '<tr>' +
                    '</tr>' +
                    '<tr>' +
                    '<td class="text">' +
                    '<div style="color: gray; font-size: 12pt; margin-top: 10px; padding: 5px; border-top: 1pt solid silver">' +
                    'AVISO: Actualmente la licencia para este módulo está vencida, por favor contacte al equipo comercial de LatamReady' +
                    '. </br>' +
                    'También puedes contactar con nosotros a través de ' +
                    'www.Latamready.com' +
                    '</div>' +
                    '</td>' +
                    '</tr>' +
                    '</table>' +
                    '</html>';
                myInlineHtml.defaultValue = strhtml;

                return form;
            }

            form.addFieldGroup({
                id: 'mainGroup',
                label: 'Información Primaria'
            });

            let subsidiaryField;

            if (this.FEAT_SUBS == true || this.FEAT_SUBS == 'T') {
                subsidiaryField = form
                    .addField({
                        id: 'custpage_subsidiary',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Subsidiária',
                        container: 'mainGroup'
                    })
                    .setHelpText({
                        help: 'custpage_subsidiary'
                    });
                subsidiaryField.isMandatory = true;
            }

            let typeTransaction = form.addField({
                id: 'custpage_type_transaction',
                type: serverWidget.FieldType.SELECT,
                label: 'Tipo de transaccion',
                container: 'mainGroup'
            })
                .setHelpText({
                    help: 'custpage_type_transaction'
                });
            typeTransaction.isMandatory = true;   
            
            form.addFieldGroup({
                id: 'dateRangeGroup',
                label: 'Rango de fechas'
            });


            let startDateField = form
                .addField({
                    id: 'custpage_start_date',
                    type: serverWidget.FieldType.DATE,
                    label: 'Fecha de inicio',
                    container: 'mainGroup'
                })
                .setHelpText({
                    help: 'custpage_start_date'
                });


            let endDateField = form
                .addField({
                    id: 'custpage_end_date',
                    type: serverWidget.FieldType.DATE,
                    label: 'Fecha de fin',
                    container: 'mainGroup'
                })
                .setHelpText({
                    help: 'custpage_end_date'
                });         

            form.addField({
                id: 'custpage_status',
                type: serverWidget.FieldType.TEXT,
                label: 'Status'
            }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            form.addField({
                id: 'custpage_log_id',
                type: serverWidget.FieldType.TEXT,
                label: 'Log ID'
            }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            let deployIdField = form
                .addField({
                    id: 'custpage_deploy_id',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Deploy ID'
                })
                .updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
            deployIdField.defaultValue = runtime.getCurrentScript().deploymentId;

            if (!Number(this.params.status)) {
                form.addSubmitButton({
                    label: this.getText('filter')
                });
                checkField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
            } else {
                form.addSubmitButton({
                    label: this.getText('next')
                });
                form.addButton({
                    id: 'btn_back',
                    label: this.getText('back'),
                    functionName: 'back'
                });

                if (subsidiaryField) {
                    subsidiaryField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                }
                startDateField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                endDateField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                typeTransaction.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

                if (depField) {
                    depField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                }
                if (classField) {
                    classField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                }
                if (locField) {
                    locField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                }
            }

            form.addResetButton({
                label: this.getText('reset')
            });

            return form;
        }

        loadFormValues() {
            if (this.FEAT_SUBS == true || this.FEAT_SUBS == 'T') {
                this.fillSubsidiaries();
            }
            this.fillTypeTransaction();
        }

        fillSubsidiaries() {
            let subsidiaryField = this.form.getField({
                id: 'custpage_subsidiary'
            });

            if (subsidiaryField) {
                subsidiaryField.addSelectOption({ value: 0, text: '&nbsp;' });

                if (this.subsidiaries) {
                    for (let i = 0; i < this.subsidiaries.length; i++) {
                        let id = this.subsidiaries[i].value;
                        let name = this.subsidiaries[i].text;
                        // licenses = this.licensesBySubsidiary[id] || [];
                        if (this.subsidiaries[i].active) {
                            subsidiaryField.addSelectOption({ value: id, text: name });
                        }
                    }
                }
            }
        }

        fillTypeTransaction(){
            let typeTransactionField = this.form.getField({
                id: 'custpage_type_transaction'
            });

            if (typeTransactionField) {
                typeTransactionField.addSelectOption({ value: 0, text: '&nbsp;' });
                for (let type in this.typesTransaction){
                    typeTransactionField.addSelectOption({ value: type, text: this.typesTransaction[type] });
                }

            }       
        }

        getTypeTransaction(){
            return {
                "invoice":"Invoice",
                "creditmemo": "Credit Memo",
                "customerpayment":"Payment"
            }
        }

        getRedirectParams() {
            let params = this.params;
            return {
                subsidiary: params.custpage_subsidiary || '',
                startDate: params.custpage_start_date || '',
                endDate: params.custpage_end_date || '',
                typeTransaction: params.custpage_type_transaction || '',
                status: '1'
            };
        }

        setFormValues() {
            let {
                subsidiary,
                startDate,
                endDate,
                typeTransaction
            } = this.params;
            let form = this.form;

            let allLicenses = {};
            let licenses = [];
            if (this.FEAT_SUBS == true || this.FEAT_SUBS == 'T') {
                if (Number(subsidiary)) {
                    let subsidiaryField = form.getField({ id: 'custpage_subsidiary' });
                    let name = search.lookupFields({
                        type: 'subsidiary',
                        id: subsidiary,
                        columns: ['name']
                    }).name;
                    subsidiaryField.addSelectOption({ value: subsidiary, text: name });
                    subsidiaryField.defaultValue = subsidiary;
                }

            }
            let typeTransactionField = form.getField({ id: 'custpage_type_transaction' });
            typeTransactionField.addSelectOption({ value: typeTransaction, text: this.typesTransaction[typeTransaction] });
            typeTransactionField.defaultValue = typeTransaction;


            form.updateDefaultValues({
                custpage_start_date: startDate || '',
                custpage_end_date: endDate || '',
                custpage_status: '1',
                custpage_type_transaction: typeTransaction || "",
            });
        }

        createTransactionSublist() {
            this.form.addTab({
                id: 'transactions_tab',
                label: 'transaccciones'
            });

            this.sublist = this.form.addSublist({
                id: 'custpage_results_list',
                label: 'resultados',
                tab: 'transactions_tab',
                type: serverWidget.SublistType.LIST
            });

            let sublist = this.sublist;

            sublist.addField({
                id: 'apply',
                label: 'aplicar',
                type: serverWidget.FieldType.CHECKBOX
            });

            sublist.addField({
                id: 'internalid',
                label: 'Id interno',
                type: serverWidget.FieldType.TEXT
            });
            sublist.addField({
                id: 'type_transaction',
                label: 'Tipo de transaccion',
                type: serverWidget.FieldType.TEXT
            });
            sublist.addField({
                id: 'legal_document_type',
                label: 'Numero de documento fiscal',
                type: serverWidget.FieldType.TEXT
            });

            sublist.addField({
                id: 'tranid',
                label: 'Nùmero de Documento',
                type: serverWidget.FieldType.TEXT
            });

            let totalAmtField = sublist.addField({
                id: 'total_amt',
                label: 'Importe documento',
                type: serverWidget.FieldType.CURRENCY
            });

            totalAmtField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
            totalAmtField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

            sublist.addButton({
                id: 'btn_mark_all',
                label: 'Seleccionar todo',
                functionName: 'toggleCheckBoxes(true)'
            });

            sublist.addButton({
                id: 'btn_desmark_all',
                label: 'Deseleccionar todo',
                functionName: 'toggleCheckBoxes(false)'
            });

            return sublist;
        }

        loadBillSublist() {
            let data = this.getTransactions();

            let sublist = this.form.getSublist({ id: 'custpage_results_list' });

            log.debug('loadBillSublist', data.length);
            for (let i = 0; i < data.length; i++) {
                let { id, tranid, entity, entitytext, trandate, doctype, totalAmt, amountDue, totalHidden } = data[i];

                sublist.setSublistValue({ id: 'apply', line: i, value: 'F' });

                if (tranid) {
                    sublist.setSublistValue({ id: 'tranid', line: i, value: tranid });
                }

                let tranUrl = url.resolveRecord({ recordType: 'vendorbill', recordId: id, isEditMode: false });
                let urlID = `<a class="dottedlink" href=${tranUrl} target="_blank">${id}</a>`;

                sublist.setSublistValue({ id: 'internalidtext', line: i, value: id });
                sublist.setSublistValue({ id: 'internalid', line: i, value: urlID });

                if (entity && this.names.process == 'Massive') {
                    sublist.setSublistValue({ id: 'vendor', line: i, value: entity });
                    sublist.setSublistValue({ id: 'vendortext', line: i, value: entitytext });
                }

                if (trandate) {
                    sublist.setSublistValue({ id: 'date', line: i, value: trandate });
                }

                if (doctype) {
                    sublist.setSublistValue({ id: 'doctype', line: i, value: doctype });
                }

                if (totalAmt) {
                    sublist.setSublistValue({ id: 'total_amt', line: i, value: totalAmt.toFixed(2) });
                }

                if (amountDue) {
                    sublist.setSublistValue({ id: 'amount_due', line: i, value: amountDue.toFixed(2) });
                }

                if (totalHidden) {
                    sublist.setSublistValue({ id: 'total_hidden', line: i, value: Number(totalHidden).toFixed(2) });
                }
            }

            if (data.length) {
                sublist.label = `${sublist.label} (${data.length})`;
            }
        }

        getTransactions() {
            let data = [];
            let { vendor, multivendor, currency, ap_account, subsidiary, date } = this.params;

            if (Number(currency) && Number(ap_account)) {
                let filters = [
                    ['status', 'anyof', 'VendBill:A'],
                    'AND',
                    ['currency', 'anyof', currency],
                    'AND',
                    ['account', 'anyof', ap_account],
                    'AND',
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['amountremaining', 'greaterthan', '0.00'],
                    'AND',
                    ['custbody_lmry_apply_wht_code', 'is', 'T'],
                    'AND',
                    ['custbody_lmry_concepto_detraccion', 'anyof', ['@NONE@', '12']] // SIN DETRACCION
                    /*'AND',
                    [
                        [
                            ['applyingtransaction.fxamount', 'greaterthan', '0.00'],
                            'AND',
                            ['applyingtransaction.type', 'anyof', 'VendCred']
                        ],
                        'OR',
                        ['applyingtransaction.fxamount', 'isempty', '0.00']
                    ]*/
                ];

                let settings = [];

                if (Number(vendor)) {
                    filters.push('AND', ['entity', 'anyof', vendor]);
                }

                if (multivendor && multivendor.split('\u0005').length) {
                    filters.push('AND', ['entity', 'anyof', multivendor.split('\u0005')]);
                }

                if (this.FEAT_SUBS == true || this.FEAT_SUBS == 'T') {
                    filters.push('AND', ['subsidiary', 'anyof', subsidiary]);
                    settings = [search.createSetting({ name: 'consolidationtype', value: 'NONE' })];
                }

                if (this.FEAT_APPROV_BILL == true || this.FEAT_APPROV_BILL == 'T') {
                    filters.push('AND', ['approvalstatus', 'anyof', '2']);
                }
                /*
                                if (date) {
                                    filters.push('AND', ['trandate', 'onorbefore', [date]]);
                                }
                */

                let columns = [];
                columns.push(search.createColumn({ name: 'internalid', sort: search.Sort.DESC }));
                columns.push(search.createColumn({ name: 'formulatext', formula: '{tranid}' }));
                columns.push(search.createColumn({ name: 'trandate' }));
                columns.push(search.createColumn({ name: 'custbody_lmry_document_type' }));
                columns.push(search.createColumn({ name: 'entity' }));
                columns.push(search.createColumn({ name: 'memo' }));
                columns.push(search.createColumn({ name: 'fxamount' }));
                columns.push(search.createColumn({ name: 'fxamountpaid' }));
                columns.push(search.createColumn({ name: 'fxamountremaining' }));
                columns.push(
                    search.createColumn({ name: 'fxamount', join: 'applyingtransaction', sort: search.Sort.ASC })
                );

                let searchTransactions = search.create({
                    type: 'vendorbill',
                    filters: filters,
                    columns: columns,
                    settings: settings
                });

                let pageData = searchTransactions.runPaged({ pageSize: 1000 });
                if (pageData) {
                    pageData.pageRanges.forEach(function (pageRange) {
                        let page = pageData.fetch({ index: pageRange.index });
                        let results = page.data;
                        if (results) {
                            let prev = '';
                            for (let i = 0; i < results.length; i++) {
                                let id = results[i].getValue('internalid');
                                id = String(id);
                                let tranid = results[i].getValue('formulatext') || '';
                                let trandate = results[i].getValue('trandate');
                                let doctype = results[i].getText('custbody_lmry_document_type') || '';
                                let entity = results[i].getValue('entity') || '';
                                let entitytext = results[i].getText('entity') || '';
                                let alreadyapplied = results[i].getValue({
                                    name: 'fxamount',
                                    join: 'applyingtransaction'
                                }) || 0.00;
                                alreadyapplied = Math.abs(parseFloat(alreadyapplied))
                                let totalAmt = results[i].getValue('fxamount') || 0.00;
                                totalAmt = parseFloat(totalAmt);
                                // let totalHidden = results[i].getValue('fxamount') || 0.0;
                                // if (featureLatam && totalHidden) {
                                //     totalHidden -= Math.abs(alreadyapplied);
                                // }
                                let amountDue = results[i].getValue('fxamountremaining');
                                amountDue = Number(amountDue);
                                if (!amountDue) {
                                    continue;
                                }

                                let billObj = data.find((b) => b.id == id);
                                if (!billObj) {
                                    billObj = {
                                        id: id,
                                        tranid: tranid,
                                        trandate: trandate,
                                        doctype: doctype,
                                        entity: entity,
                                        entitytext: entitytext,
                                        totalAmt: totalAmt,
                                        amountDue: amountDue,
                                        totalHidden: totalAmt
                                    };
                                    data.push(billObj);
                                }

                                if (featureLatam) {
                                    billObj.totalHidden = round2(billObj.totalHidden - alreadyapplied);
                                }

                            }
                        }
                    });
                }
            }
            log.debug("data", JSON.stringify(data));
            return data;
        }

        getBillCredits() {
            let data = [];
            let { vendor, currency, ap_account, subsidiary, date } = this.params;

            if (Number(vendor) && Number(currency) && Number(ap_account)) {
                let filters = [
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['appliedtotransaction', 'anyof', '@NONE@'],
                    'AND',
                    ['currency', 'anyof', currency],
                    'AND',
                    ['account', 'anyof', ap_account],
                    'AND',
                    ['amountremaining', 'greaterthan', '0.00'],
                    'AND',
                    ['entity', 'anyof', vendor]
                ];

                let settings = [];

                if (this.FEAT_SUBS == true || this.FEAT_SUBS == 'T') {
                    filters.push('AND', ['subsidiary', 'anyof', subsidiary]);
                    settings = [search.createSetting({ name: 'consolidationtype', value: 'NONE' })]
                }

                if (date) {
                    filters.push('AND', ['trandate', 'onorbefore', [date]]);
                }

                let searchCreditMemos = search.create({
                    type: 'vendorcredit',
                    filters: filters,
                    columns: [
                        search.createColumn({ name: 'trandate', sort: search.Sort.DESC }),
                        'internalid',
                        'fxamount',
                        'fxamountremaining',
                        'tranid',
                        'custbody_lmry_document_type',
                        'appliedtotransaction'
                    ],
                    settings: settings
                });

                let pageData = searchCreditMemos.runPaged({ pageSize: 1000 });
                if (pageData) {
                    pageData.pageRanges.forEach(function (pageRange) {
                        let page = pageData.fetch({ index: pageRange.index });
                        let results = page.data;
                        if (results) {
                            for (let i = 0; i < results.length; i++) {
                                let id = results[i].getValue('internalid');
                                id = String(id);
                                let trandate = results[i].getValue('trandate');
                                let totalAmt = results[i].getValue('fxamount') || 0.0;
                                totalAmt = Math.abs(parseFloat(totalAmt));
                                let doctype = results[i].getText('custbody_lmry_document_type') || '';

                                let tranid = results[i].getValue('tranid') || '';
                                if (id) {
                                    data.push({
                                        id: id,
                                        type: 'vendorcredit',
                                        tranid: tranid,
                                        date: trandate,
                                        doctype: doctype,
                                        totalAmt: totalAmt
                                    });
                                }
                            }
                        }
                    });
                }
            }
            return data;
        }

        createVendorsField(form, vendorIds) {
            let vendorNames = [];
            let vendorSearch = search.create({
                type: 'vendor',
                filters: [['isinactive', 'is', 'F'], 'AND', ['internalid', 'anyof', vendorIds]],
                columns: ['companyname', 'firstname', 'middlename', 'lastname', 'isperson', 'entityid']
            });

            let results = vendorSearch.run().getRange(0, 100);
            for (let i = 0; i < results.length; i++) {
                let name = '';
                let isPerson = results[i].getValue({ name: 'isperson' });
                let entityid = results[i].getValue({ name: 'entityid' });
                let firstName = results[i].getValue({ name: 'firstname' });
                let lastName = results[i].getValue({ name: 'lastname' });

                if (entityid != null && entityid != '') {
                    name += entityid + ' ';
                }

                if (isPerson) {
                    name += firstName + ' ';
                    let middleName = results[i].getValue({ name: 'middlename' });
                    if (middleName != null && middleName != '') {
                        name += middleName.substring(0, 1) + ' ';
                    }
                    name += lastName;
                } else {
                    let companyName = results[i].getValue({ name: 'companyname' });
                    if (companyName != null && companyName != '') {
                        name += companyName;
                    }
                }
                if (name) {
                    vendorNames.push(name);
                }
            }

            if (vendorNames.length) {
                // Se muestran solo los primeros 10
                let numVendorLimit = 8;
                let vendorsHtml = vendorNames.slice(0, numVendorLimit + 1).join('<br/>');
                if (vendorNames.length > numVendorLimit) {
                    vendorsHtml += '<br/>...';
                }

                let vendorHtmlField = form.addField({
                    id: 'custpage_vendor_arr_html',
                    label: 'Vendors HTML',
                    type: serverWidget.FieldType.INLINEHTML,
                    container: 'group_pi'
                });

                let Label = this.getText('vendor');
                vendorHtmlField.defaultValue =
                    '<div class="uir-field-wrapper" data-field-type="select">' +
                    '<span id="subsidiaryrestriction_fs_lbl_uir_label" class="smallgraytextnolink uir-label">' +
                    '<span id="subsidiaryrestriction_fs_lbl" class="smallgraytextnolink">' +
                    '<a tabindex="-1" class="smallgraytextnolink">' +
                    Label +
                    '</a>' +
                    '</span></span><span class="uir-field inputreadonly">' +
                    '<span class="inputreadonly">' +
                    vendorsHtml +
                    '</span>' +
                    '</span>' +
                    '</div>';
                form.insertField({
                    field: vendorHtmlField,
                    nextfield: 'custpage_multi_vendor'
                });
            }
        }

        runMapReduce(parametros) {
            let allLicenses = {};
            let licenses = [];
            if (this.FEAT_SUBS == true || this.FEAT_SUBS == 'T') {
                allLicenses = LibraryMail.getAllLicenses();
                licenses = allLicenses[this.params.custpage_subsidiary];
            } else {
                licenses = LibraryMail.getLicenses(1);
            }

            // 136 : Peru	Basic	Localization
            log.debug('featureLatam', featureLatam);
            featureLatam = LibraryMail.getAuthorization(136, licenses);
            let MPRD_SCRIPT_ID = featureLatam ? 'customscript_smc_pe_wht_pur_mprd' : this.names.scriptid;
            let MPRD_DEPLOY_ID = featureLatam ? 'customdeploy_smc_pe_wht_pur_mprd' : this.names.deployid;
            let parameters = {};
            if (featureLatam) {
                parameters.custscript_smc_pe_wht_pur_state = parametros.state;
                parameters.custscript_smc_pe_wht_pur_user = parametros.user;
            } else {
                let lengthState = parametros.state.length;
                parameters[this.names.paramstate] =
                    this.names.process == 'Individual'
                        ? parametros.state.substring(0, lengthState - 1)
                        : parametros.state;
                parameters[this.names.paramuser] = parametros.user;
            }

            log.debug('MPRD_SCRIPT_ID', MPRD_SCRIPT_ID);
            log.debug('MPRD_DEPLOY_ID', MPRD_DEPLOY_ID);
            log.debug('parameters', parameters);
            task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: MPRD_SCRIPT_ID,
                deploymentId: MPRD_DEPLOY_ID,
                params: parameters
            }).submit();
        }

        toLogSuitelet() {
            let STLT_LOG_ID = 'customscript_smc_pe_wht_pur_log_stlt';
            let DEPLOY_LOG_ID = 'customdeploy_smc_pe_wht_pur_log_stlt';
            redirect.toSuitelet({
                scriptId: STLT_LOG_ID,
                deploymentId: DEPLOY_LOG_ID
            });
        }

        getTranslator() {
            return translation.load({
                collections: [
                    {
                        alias: 'text',
                        collection: 'custcollection_smc_pe_translations',
                        keys: [
                            'title_pe_wht_pur',
                            'title_pe_wht_pur_mas',
                            'license_expired',
                            'contact_us',
                            'primary_information',
                            'subsidiary',
                            'vendor',
                            'customer',
                            'currency',
                            'type',
                            'bill_credit',
                            'journal_entry',
                            'exchangerate',
                            'ap_account',
                            'ar_account',
                            'bank_account',
                            'date',
                            'period',
                            'duedate',
                            'memo',
                            'check',
                            'classification',
                            'department',
                            'class',
                            'location',
                            'payment_method',
                            'payment_information',
                            'results',
                            'apply',
                            'internal_id',
                            'document_number',
                            'document_type',
                            'total_amt',
                            'amount_due',
                            'payment_amt',
                            'advances',
                            'mark_all',
                            'desmark_all',
                            'reset',
                            'filter',
                            'next',
                            'back',
                            'transactions'
                        ]
                    }
                ]
            });
        }

        getText(key, params) {
            key = key.toUpperCase();
            let funcTranslator = this.translator.text[key];
            if (funcTranslator) {
                if (params && params.length) {
                    return funcTranslator({ params: params });
                } else {
                    return funcTranslator();
                }
            }
            return '';
        }
    }

    const round2 = (num) => {
        var e = (num >= 0) ? 1e-6 : -1e-6;
        return parseFloat(Math.round(parseFloat(num) * 1e2 + e) / 1e2);
    }


    return {
        LibraryHandler: LibraryHandler
    };
});