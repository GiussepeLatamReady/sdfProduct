/* eslint-disable no-alert */
/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for WTH on Purchases                           ||
||                                                              ||
||  File Name: SMC_MX_Reverse_Cancellation_CLNT_LBRY_V2.1.js    ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.1     Oct 04 2023  LatamReady    Use Script 2.1           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */
/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @Author master@latamready.com
 */

define([
    'N/runtime',
    'N/search',
    'N/record',
    'N/format',
    'N/ui/message',
    'SuiteBundles/Bundle 37714/Latam_Library/LMRY_Log_LBRY_V2.0',
], function (
    runtime,
    search,
    record,
    format,
    message,
    lbryLog,
) {
    const ScriptName = 'SMC_MX_Reverse_Cancellation_CLNT_LBRY_V2.1.js';
    class ClntHandler {
        constructor(options) {
            this.FEAT_SUBS = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });

            this.deploy = options.deployid;
            this.featurelatam = options.featurelatam || 'F';
            this.names = this.getNames(this.deploy);

        }
        getNames(deploy) {
            let nameList = {
                customdeploy_smc_mx_rever_canc_stlt: {
                    scriptmprd: 'customscript_smc_mx_rever_canc_mprd',
                    deploymprd: 'customdeploy_smc_mx_rever_canc_mprd'
                }
            };
            return nameList[deploy];
        }

        saveRecord(context) {
            try {
                this.currentRecord = context.currentRecord;
                let recordObj = context.currentRecord;
                let status = recordObj.getValue({ fieldId: 'custpage_status' });
                status = Number(status);
                if (!status) {
                    if (!this.validateMandatoryFields()) {
                        return false;
                    }

                    if (!this.validateDates()) {
                        return false;
                    }
                } else {
                    if (!this.validateSublist()) {
                        return false;
                    }

                    if (!this.validateExecution()) {
                        return false;
                    }

                    if (!this.createRecordLog()) {
                        return false;
                    }
                }
            } catch (err) {
                handleError('[ saveRecord ]', err);
                return false;
            }
            return true;
        }


        validateMandatoryFields() {
            let recordObj = this.currentRecord;
            let mandatoryFields = [
                'custpage_type_transaction'
            ];

            if (this.FEAT_SUBS === true || this.FEAT_SUBS === 'T') {
                mandatoryFields.push('custpage_subsidiary');
            }

            for (let i = 0; i < mandatoryFields.length; i++) {
                let fieldObj = recordObj.getField({ fieldId: mandatoryFields[i] });
                if (fieldObj) {
                    let value = recordObj.getValue({ fieldId: mandatoryFields[i] }) || '';
                    value = Number(value);
                    if (!value) {
                        // Please enter value(s) for: {1}
                        alert('Ingrese un valor para :'+ [fieldObj.label]);
                        return false;
                    }
                }
            }
            return true;
        }

        validateDates() {
            let recordObj = this.currentRecord;
            let startDate = recordObj.getValue('custpage_start_date');
            if (startDate) {
                startDate = format.parse({ value: startDate, type: format.Type.DATE });
            }
            let endDate = recordObj.getValue('custpage_end_date');
            if (endDate) {
                endDate = format.parse({ value: endDate, type: format.Type.DATE });

                if (endDate > startDate) {
                    // The date in "{1}" must be on or before the date in "{2}".
                    let fieldStartDate = recordObj.getField({ fieldId: 'custpage_start_date' });
                    let fieldEndDate = recordObj.getField({ fieldId: 'custpage_end_date' });
                    alert(`La ${fieldStartDate.label} debe ser igual o anterior a la ${fieldEndDate.label}`);
                    return false;
                }
            }

            return true;
        }

        validateSublist() {
            let recordObj = this.currentRecord;
            let numberLines = recordObj.getLineCount({ sublistId: 'custpage_results_list' });
            if (numberLines < 1) {
                // No transactions selected.
                alert("No hay transacciones Seleccionadas");
                return false;
            } 

            return true;
        }

        validateExecution() {
            let mprd_scp = 'customscript_smc_mx_rever_canc_mprd';
            let mprd_dep ='customdeploy_smc_mx_rever_canc_mprd';
            let search_executions = search.create({
                type: 'scheduledscriptinstance',
                filters: [
                    ['status', 'anyof', 'PENDING', 'PROCESSING'],
                    'AND',
                    ['script.scriptid', 'is', mprd_scp],
                    'AND',
                    ['scriptdeployment.scriptid', 'is', mprd_dep]
                ],
                columns: [
                    search.createColumn({
                        name: 'timestampcreated',
                        sort: search.Sort.DESC
                    }),
                    'mapreducestage',
                    'status',
                    'taskid'
                ]
            });

            let results = search_executions.run().getRange(0, 1);

            if (results && results.length) {
                let myMsg = message.create({
                    title: 'Alerta',
                    message: 'Espere un momento por favor, el proceso se encuentra en curso.',
                    type: message.Type.INFORMATION,
                    duration: 8000
                });
                myMsg.show();
                return false;
            }

            return true;
        }

        createRecordLog() {
            let currentRecord = this.currentRecord;
            let form ={
                ids:[]
            };

            
            form.subsidiary = Number(currentRecord.getValue({ fieldId: 'custpage_subsidiary' })) || '';
            form.typeTransaction = currentRecord.getValue({ fieldId: 'custpage_type_transaction' });
            form.startDate = currentRecord.getValue({ fieldId: 'custpage_start_date' });
            form.endDate = currentRecord.getValue({ fieldId: 'custpage_end_date' });

            let numberLines = currentRecord.getLineCount({ sublistId: 'custpage_results_list' });
            for (let i = 0; i < numberLines; i++) {

                isApplied = currentRecord.getSublistValue({
                    sublistId: 'custpage_results_list',
                    fieldId: 'apply',
                    line: i
                });

                if (isApplied) {
                    form.ids.push( currentRecord.getSublistValue({sublistId: 'custpage_results_list',fieldId: 'internalidtext',line: i}));
                }
            }


            // Creacion de Logs
            let idlog = '';

            let recordlog = record.create({
                type: 'customrecord_smc_mx_rever_cancel_log'
            });
            recordlog.setValue({ fieldId: 'custrecord_smc_mx_rcd_log_subsi', value: form.subsidiary });
            recordlog.setValue({ fieldId: 'custrecord_smc_mx_rcd_log_start_date', value: form.startDate });
            recordlog.setValue({ fieldId: 'custrecord_smc_mx_rcd_log_end_date', value: form.endDate });
            recordlog.setValue({ fieldId: 'custrecord_smc_mx_rcd_log_state', value: 'Preview' });
            recordlog.setValue({ fieldId: 'custrecord_smc_mx_rcd_log_employee',value: runtime.getCurrentUser().id});
            recordlog.setValue({ fieldId: 'custrecord_smc_mx_rcd_log_transact',value: JSON.stringify(form.ids)});
            recordlog.setValue({ fieldId: 'custrecord_smc_mx_rcd_log_type',value: getTypeTransaction(form.typeTransaction)});
            idlog +=recordlog.save({ enableSourcing: true, ignoreMandatoryFields: true, disableTriggers: true }) +'|';

            currentRecord.setValue({ fieldId: 'custpage_log_id', value: idlog, ignoreFieldChange: true });

            console.log('idlog: ' + idlog);
            return true;
        }

    }

    function getTypeTransaction(){
        return {
            "Invoice":"invoice",
            "Credit Memo": "creditmemo",
            "Payment":"customerpayment"
        }
    }
    function handleError(functionName, err) {
        console.error(functionName, err);
        lbryLog.doLog({ title: functionName, message: err, relatedScript: ScriptName });
        alert(functionName + '\n' + JSON.stringify({ name: err.name, message: err.message }));
    }

    return {
        ClntHandler: ClntHandler
    };
});
