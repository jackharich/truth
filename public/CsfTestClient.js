// Setup and excercise the test client.
let clientAuth;
let testClient;

class CsfTestClient {
    static init() {
        testClient = new CsfTestClient();
    }
    constructor() {
        this.requestor      = new CsfRequestor();
        clientAuth          = new CsfClientAuth(this.requestor);
        this.resultContents = document.querySelector('.result-contents');
    }
    // ----- Data persistance test methods.
    clearContent() {
        this.resultContents.innerHTML = '';
    }
    getUser() {
        this.requestor.getOneRecord(CsfRequestor.USERS_TABLE, 2, (record) => { 
            if (record) {
                this.updateResults('Got ' + record.id + ' ' + record.fullName);
            } else {
                this.updateResults('Not found.');
            }
        });
    } 
    getAllUsers() {
        this.requestor.getAllRecords(CsfRequestor.USERS_TABLE, (records) => { 
            if (records) {
                this.updateResults('--- getAllRecords');
                for (let record of records) {
                    this.updateResultsRecord(record);
                }
            } else {
                this.updateResults('getAllRecords failed.');
            }
        });
    }
    getAllUsersWhere() {
        this.requestor.getAllRecordsWhere(CsfRequestor.USERS_TABLE, { organizationId: 2 }, (records) => { 
            if (records) {
                this.updateResults('--- getAllRecordsWhere organizationId = 2');
                for (let record of records) {
                    this.updateResultsRecord(record);
                }
            } else {
                this.updateResults('getAllRecords failed.');
            }
        });
    }
    addUser() {
        let newRecordValues = {};        
        newRecordValues.fullName       = 'Philip Bangerter';
        newRecordValues.password       = 'xxxxxxxxxxxxxxxxx'; 
        newRecordValues.emailAddress   = 'p.bangerter@uq.edu.au';
        newRecordValues.isOrgAdmin     = false;
        newRecordValues.isSystemAdmin  = false;
        newRecordValues.organizationId = 2;

        this.requestor.addRecord(CsfRequestor.USERS_TABLE, newRecordValues, (mutationResult) => { 
            if (mutationResult.success) {
                this.updateResults('Added id=' + mutationResult.id);
            } else {
                // Due to emailAddress must be unique, record already there.
                this.updateResults('Add failed due to errror - ' + mutationResult.error); 
            }
        });
    }
    updateUser() {
        const ID = 6;
        let updateValues = {};
        updateValues.fullName      = 'CHANGED NAME';
        updateValues.isOrgAdmin    = true;

        this.requestor.updateRecord(CsfRequestor.USERS_TABLE, ID, updateValues, (mutationResult) => { 
            if (mutationResult.success) {
                this.updateResults('Update id=' + ID + ' succeeded');
            } else {
                this.updateResults('Update id=' + ID + ' failed due to errror - ' + mutationResult.error); 
            }
        });
    }
    deleteUser() {
        const ID = 6; // Will cause error not found.
        this.requestor.deleteRecord(CsfRequestor.USERS_TABLE, ID, (mutationResult) => { 
            if (mutationResult.success) {
                this.updateResults('Delete id=' + ID + ' succeeded');
            } else {
                this.updateResults('Delete id=' + ID + ' failed due to errror - ' + mutationResult.error);  
            }
        });
    }
    // ----- Persistance helpers.
    updateResults(text) {
        this.resultContents.innerHTML += `<p>${text}</p>`;
    }    
    updateResultsRecord(record) {
        this.resultContents.innerHTML += `<div><div class="csf-result-contents-column1">${record.id} ${record.fullName}</div><div class="csf-result-contents-column2">${record.emailAddress}</div></div>`;
    }
}