/* Contents:
    class CsfTables - Manages the database tables.
    class CsfTable  - The superclass for tables.
    class CsfTableUsers         - Subclass for users table.
    class CsfTableOrganizations - Subclass for organizations table.
*/
class CsfTables {
    static get ORGANIZATIONS_TABLE() { return 'organizations'; }
    static get USERS_TABLE()         { return 'users'; }

    constructor(Sequelize, sequelize) {
        this.Sequelize = Sequelize;
        this.sequelize = sequelize;
        this.tables = new Map(); // Key is table name, value is CsfTable instance.

        // Add tables. More to come. ===== Need to set one to many.
        let organizations = new CsfTableOrganizations(Sequelize, sequelize);
        this.tables.set(organizations.name, organizations);

        let users = new CsfTableUsers(Sequelize, sequelize);
        this.tables.set(users.name, users);

        // Create and populate tables not already in the database.
        sequelize.getQueryInterface().showAllTables().then( (tableNames)=>{
            // Put the array in a map.
            let dbTableNames = new Map();
            for (let tableName of tableNames) {
                dbTableNames.set(tableName, 'xxx');
            }
            // Walk my tables. If not in dbTableNames, create table and addInitialRecords.
            for (let [tableName, table] of this.tables) {
                let there = dbTableNames.get(tableName);
                if (! there) {
                    // Not in database so create and populate it.
                    console.log('Table not in database: ' + tableName);
                    table.table.sync({force: true}).then(() => { // force = true drops the table.
                        table.addInitialRecords();
                    });
                } else {
                    console.log('Table already in database: ' + tableName);
                }
            }            
        });
    } 
    getTable(name) {
        let table = this.tables.get(name); 
        if (table) {
            return table;
        } else {
            console.log('Error: getTable() - Table name ' + name + ' not found.');
            return undefined;
        }
    }
    // Create hashed pwd. Example:
    // csfTables.logHashedPassword(trsServerAuth, 'xxx');
    logHashedPassword(csfServerAuth, password) {
        console.log('Hash for ' + password + ' = ' + csfServerAuth.createHashedPassword(password));
    }
} // End class CsfTables

class CsfTable { // The superclass for other tables. ALL public methods are async so they return promises.
    constructor(Sequelize, sequelize) {
        this.Sequelize = Sequelize;
        this.sequelize = sequelize;
        this.name;  // Set by subclass.
        this.table; // Set by subclass.
    }
    // ----- Get methods -----
    async getAllRecords(whereFilter, preservePassword) {
        // Returns an array of record objects in defauilt order. Array is empty if no records found.
        // Later will implement pagination. See http://docs.sequelizejs.com/manual/tutorial/querying.html.
        // whereFilter is optional. Example: { organizationId: 2 }. See above link for advanced use of whereFilter.
        // preservePassword is true to not remove password.
        let result;
        let defaultOrder = this.getStandardOrder();
        let options = {order: defaultOrder}
        if (whereFilter) options.where = JSON.parse(whereFilter);
        //console.log('getAllRecords options = ' + JSON.stringify(options));

        await this.table.findAll(options).then(records => {
            if (records) {
                result = this.convertSequelizeResultToArrayOfRecordObjects(records);
                if (this.name === CsfTables.USERS_TABLE && ! preservePassword) { // If users table remove password.
                    for (let record of result) { record.password = undefined; }
                }
            }
        }); 
        return result;
    }
    async countRecords() { // Not yet tested. =====
        // Returns the total number of records. If zero the table may be safely dropped and created.
        let result;
        await this.table.count().then(numberRecords => {
            result = numberRecords;
        }); 
        return result;
    }
    async getRecord(id) {
        // Returns the record object or undefined if not found.
        let result;
        await this.table.findById(id).then(record => {
            if (record) {
                result = record.dataValues; // A JSON object.
                if (this.name === CsfTables.USERS_TABLE) result.password = undefined; // If users table remove password.
            }
        }); 
        return result;
    }
    // ----- Mutate methods -----
    async addRecord(record) {
        // Adds one record using the provided record, which contains initial data and no id. Returns new id.
        // If subclasses have special requirements they can override this method.
        let id;
        await this.table.create(record).then(record => {		
            id = record.id; // Get the new id via a promise.
        });
        return id;
    }
    async deleteRecord(deleteId) {
        // Deletes the record. Returns true or false for success.
        let success = false;
        await this.table.destroy({ where: { id: deleteId } }).then(deletedId => {
            success = deletedId > 0;
        }); 
        return success;
    }
    async updateRecord(updateId, updateValues) {
        // Updates the record with the provided attribute values. Returns true or false for success.
        // Example: updateValues = { name: 'changed name', age: 37 }
        let success = false;
        await this.table.update(updateValues, { where: { id: updateId } }).then(numberOfAffectedRows => {
            success = numberOfAffectedRows > 0;
        }); 
        return success;
    }
    addInitialRecords() {
        // Optional override.
    }
    // ----- Helpers -----
    convertSequelizeResultToArrayOfRecordObjects(sequealizeRecords) {
        let records = [];
        for (let item of sequealizeRecords) {
            records.push(item.dataValues);
        }
        return records;
    }
} // End class CsfTable

class CsfTableUsers extends CsfTable {
    constructor(Sequelize, sequelize) {
        super(Sequelize, sequelize);
        this.name = CsfTables.USERS_TABLE;
        this.table = this.sequelize.define(this.name, { 
            fullName:       { type: this.Sequelize.STRING, allowNull: false },
            password:       { type: this.Sequelize.STRING, allowNull: false },
            emailAddress:   { type: this.Sequelize.STRING, allowNull: false, unique: true },
            isOrgAdmin:     { type: Sequelize.BOOLEAN,     allowNull: false, defaultValue: false },
            isSystemAdmin:  { type: Sequelize.BOOLEAN,     allowNull: false, defaultValue: false },
            organizationId: { type: Sequelize.INTEGER,     allowNull: false },
        });
        // Create one to many with organizations and myself.
        //let orgs = 
    }
    // ----- These are methods all subclasses must implement.
    getStandardOrder() {
        return [ ['fullName', 'ASC'] ];
    }
    // ----- Example of custom add record -----
    // // Adds one record using the provided record, which contains initial data and no id. Returns new id.
    // async addRecord(record) {
    //     //console.log('users addRecord entered');
    //     let id;
    //     await this.table.create({  
    //         fullName:      record.fullName,
    //         password:      record.password,
    //         emailAddress:  record.emailAddress,
    //         isOrgAdmin:    record.isOrgAdmin,
    //         isSystemAdmin: record.isSystemAdmin,
    //         orgId:         record.orgId
    //     // Get the new id via a promise. 
    //     }).then(record => {		
    //         id = record.id;
    //         //console.log('users addRecord id = ' + id);
    //         //console.log('1---> Inside addRecord() new id = ' + id);
    //     });
    //     return id;
    // }

    // ----- Optional overrides -----
    addInitialRecords() {
        this.table.create({
            fullName: 'Administrator',
            password: '$2a$10$3HMUycVQi3fqHyAxg3k8JuPJLiRYXXtqPdnTV7hFD6CbWmQXelEyO',
            emailAddress: 'admin', // Let's see if this is a problem. It's not valid.
            organizationId: 1,
            isOrgAdmin: true,
            isSystemAdmin: true,
        }).then( ()=> { 
            this.table.create({
                fullName: 'Martha Harich',
                password: '$2a$10$UTOt50QfHnROg4eX/aaOUeO0gZq8df2ndWRstWfE2jw3avJb5CEPe',
                emailAddress: 'martha_annie@thwink.org',
                organizationId: 2,
            });                
        }).then( ()=> { 
            this.table.create({
                fullName: 'Jack Harich',
                password: '$2a$10$6Dd5Xqq2TNeSOgMqrEYHd.3BcAMrM39iDHp77Brn9xeLrF3F8ngCq',
                emailAddress: 'jack@thwink.org',
                organizationId: 1,
                isOrgAdmin: true,
                isSystemAdmin: true,
            });
        }).then( ()=> { 
            this.table.create({  
                fullName: 'Scott Booher',
                password: '$2a$10$181BsWW4lZN4j8H61wuzL.TRyaReFP6Le1qWjL5fO.1BuRhooMnsS',
                emailAddress: 'scott@thwink.org',
                organizationId: 2,
                isOrgAdmin: true,
                isSystemAdmin: true,  
            });              
        }).then( ()=> { 
            this.table.create({  
                fullName: 'Montserrat Kollofon',
                password: '$2a$10$fJhT6i1xOSvpDSr3of/S0OiIQEdRf4r0HRb.zrUrgM1gb9a.xmvSC',
                emailAddress: 'montse@thwink.org',
                organizationId: 2,
                isOrgAdmin: true,
            });              
        });
    }
} // End class CsfTableUsers

class CsfTableOrganizations extends CsfTable {
    constructor(Sequelize, sequelize) {
        super(Sequelize, sequelize);
        this.name = CsfTables.ORGANIZATIONS_TABLE;
        this.table = this.sequelize.define(this.name, { 
            name:       { type: this.Sequelize.STRING, allowNull: false },
        });
    }
    // ----- These are methods all subclasses must implement.
    getStandardOrder() {
        return [ ['name', 'ASC'] ];
    }
    // ----- Optional overrides -----
    addInitialRecords() {
        this.table.create({
            name: 'Thwink.org',
        }).then( ()=> { 
            this.table.create({
                name: 'Another Organization',
            });                
        }).then( ()=> { 
            this.table.create({
                name: 'And Another Organization',
            });             
        });
    }
} // End class CsfTableOrganizations

module.exports = CsfTables;

