/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =\
||   This script for WTH on Purchases                           ||
||                                                              ||
||  File Name: SMC_MX_Reverse_Cancellation_CLNT_V2.1.js         ||
||                                                              ||
||  Version Date         Author        Remarks                  ||
||  2.1     Oct 04 2023  LatamReady    Use Script 2.1           ||
 \= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 *@NModuleScope Public
 *@Author gerson@latamready.com
 */
 define(['./Latam_Library/SMC_MX_Reverse_Cancellation_CLNT_LBRY_V2.1', 'N/url', 'N/currentRecord'], function (
    lbryReverseCancelationClnt,
    urlApi, 
    currentRecord
) {
    const STLT_ID = 'customscript_smc_mx_rever_canc_stlt';
    let DEPLOY_ID = null;
    let handler = null;

    function pageInit(context) {
        console.log(lbryReverseCancelationClnt);
        let recordObj = context.currentRecord;
        DEPLOY_ID = recordObj.getValue('custpage_deploy_id');
        let featurelatam = recordObj.getValue('custpage_feature_latam');
        handler = new lbryReverseCancelationClnt.ClntHandler({
            deployid: DEPLOY_ID,
            featurelatam: featurelatam
        });
        console.log(handler);
    }


    function saveRecord(context) {
        return handler.saveRecord(context);
    }

    function back() {
        let urlSuitelet = urlApi.resolveScript({
            scriptId: STLT_ID,
            deploymentId: DEPLOY_ID,
            returnExternalUrl: false
        });

        window.location.href = urlSuitelet;
    }

    function toggleCheckBoxes(isApplied, sublistId) {
        let recordObj = currentRecord.get();
        let numberLines = recordObj.getLineCount({ sublistId: sublistId });
        for (let i = 0; i < numberLines; i++) {
            recordObj.selectLine({ sublistId: sublistId, line: i });
            recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'apply', value: isApplied });
        }
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        back: back,
        toggleCheckBoxes: toggleCheckBoxes
    };
});
