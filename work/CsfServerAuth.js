/* Contents 
    class CsfServerAuth - Handles authentication and authorization on the server. Concepts from:
    https://medium.freecodecamp.org/securing-node-js-restful-apis-with-json-web-tokens-9f811a92bb52
    "Authentication is the act of logging a user in. Authorization is the act of verifying 
    the access rights of a user to interact with a resource."
 */
class CsfServerAuth {
    constructor(tables) {
        this.Models = require('./CsfTables');
        this.config = require('./CsfConfig');
        this.tables = tables;
        this.jwt    = require('jsonwebtoken');
        this.bcrypt = require('bcryptjs');
    }
    // ----- Password methods ----- 
    isCorrectPassword(password, hashedPassword) {
        return this.bcrypt.compareSync(password + this.config.passwordSecret, hashedPassword);
    }
    createHashedPassword(password) {
        return this.bcrypt.hashSync(password + this.config.passwordSecret, 10);
    }
    // ----- Token methods -----
    // The client receives the token, puts it in local storage.
    createToken(userId) {
        // Expires in 10 days.
        return this.jwt.sign({ id: userId }, this.config.tokenSecret, {expiresIn: "10d" });
    }
    // Each logged in client request has x-access-token in header. For sensitive calls, use:
    // Validates token, puts results in request.app.
    async validateToken(request) {
        request.app = {}; 
        // Set defaults.
        request.app.isError       = false;
        request.app.isLoggedOn    = false;
        request.app.isOrgAdmin    = false;
        request.app.isSystemAdmin = false;
        request.app.fullName      = undefined;

        let token = request.headers['x-access-token'];
        // If no token, then user is not logged on.
        if (! token) {
            request.app.isError = true;
            request.app.error   = 'User is not logged on.';
            //console.log(request.app.error);
            return;
        }
        let decodedToken;
        try {
            decodedToken = this.jwt.decode(token, this.config.tokenSecret);
        } catch(error) {
            request.app.isError = true;
            request.app.error   = 'Error in isValidToken. Cannot decode token.';
            console.log(request.app.error);
            return;
        }
        // Check for expiration. The expiration date is in seconds so / 1000.
        if (decodedToken.exp <= Date.now() / 1000) {
            request.app.isError = true;
            request.app.error   = 'Login token has expired. Tokens expire in ten days.';
            console.log(request.app.error);
            return;
        }
        // Get user.
        let userId = decodedToken.id; 
        let usersModel = this.tables.getTable(this.Models.USERS_TABLE);

        await usersModel.getRecord(userId).then(record => {
            if (record) {
                // Valid. Put user role data in request. Later role will be more complex.
                request.app.userId        = userId; // For debugging.
                request.app.isLoggedOn    = true;   // Not yet used.
                request.app.isOrgAdmin    = record.isOrgAdmin;
                request.app.isSystemAdmin = record.isSystemAdmin;
                request.app.fullName      = record.fullName;
            }
        });
        return;
    }
} // End class CsfServerAuth

module.exports = CsfServerAuth;