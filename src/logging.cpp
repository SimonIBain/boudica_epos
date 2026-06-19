
#include "includes/logging.h"
#include "includes/postgresbc.h"
#include "includes/utils.h"

#include <pwd.h>
#include <grp.h>
#include <sys/stat.h>
#include <unistd.h>


std::string FILE_USER = "store";
std::string FILE_PASSWORD = "Th3Cur1051tyP455word";
std::string PGBC_SERVER = "localhost";    

using namespace OmniIndex::Utils;

Logging::Logging(const std::string& reason, const std::string& message) {
  log(reason, message);
}

Logging::Logging(){}

Logging::~Logging(){}

void Logging::log(const std::string& reason, const std::string& message) {
    Postgresql *pgbc = new Postgresql(FILE_USER, FILE_PASSWORD, PGBC_SERVER, "5432", "postgres"); 
    if ( pgbc->_isConnected ) {
        std::string time_now = OmniIndex::Utils::Utils::getCurrentUTCTime();
        std::string log_query = "INSERT INTO store.logs (log_timestamp, reason, message) VALUES ('" + time_now + "','" + reason + "','" + message + "');";
        pgbc->exec(log_query);
        /** We could lopk for an error here and log to SYSLOG
         * std::string erroro  = pgbc->getLastError();
         * if ( error != "" ) {
         *  //log
         * }
         */
        pgbc->close();
        delete pgbc;  
    }  
}
