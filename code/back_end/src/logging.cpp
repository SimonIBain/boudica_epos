
#include "includes/logging.h"
#include "includes/postgresbc.h"
#include "includes/utils.h"

#include <pwd.h>
#include <grp.h>
#include <sys/stat.h>
#include <unistd.h>


using namespace OmniIndex::Utils;

Logging::Logging(const std::string& reason, const std::string& message) {
  log(reason, message);
}

Logging::Logging(){}

Logging::~Logging(){}

void Logging::log(const std::string& reason, const std::string& message) {
    // The connection pool is initialized once, explicitly, at process start in main()
    // using the real service-account credentials from boudica_pos.conf (see
    // ConnectionPool::initialize() and main.cpp). Every Postgresql instance after that
    // just borrows a connection from that same pool regardless of what's passed to its
    // constructor here, so these values are placeholders, not real credentials.
    Postgresql *pgbc = new Postgresql("", "", "", "", "postgres");
    if ( pgbc->_isConnected ) {
        std::string time_now = OmniIndex::Utils::Utils::getCurrentUTCTime();
        std::vector<std::string> params = { time_now, reason, message };
        pgbc->execParams(
            "INSERT INTO store.logs (log_timestamp, reason, message) VALUES ($1, $2, $3)",
            params);
        pgbc->close();
        delete pgbc;
    }
}
