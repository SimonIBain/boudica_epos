
#include <iostream>
#include <map>
#include <vector>
#include <string>
#include <chrono>
#include <fstream>
#include <iomanip>
#include <ctime> 
#include <time.h>
#include <thread>
#include <unistd.h>
#include <string.h>
#include <thread>
#include <map>
#include <algorithm>
#include <iostream>
#include <iterator>
#include <random>
#include <ranges>
#include <compare>
#include <regex>
#include <cmath>

#include "includes/cryptography.h"
#include "includes/environment.h"
#include "includes/utils.h"
#include "includes/querydata.h"
#include "includes/postgresbc.h"
#include "includes/http.h"
#include "includes/jsonobject.h"
#include "includes/logging.h"
#include "includes/stripe.h"
#include "includes/authentication.h"

// Constants for file upload
const int MAX_FILE_SIZE = 1000 * 1024 * 1024; // 10MB max file size
const std::string UPLOAD_DIR = "uploads/";
const std::string ALLOWED_EXTENSIONS[] = {".mp4", ".txt", ".pdf", ".jpg", ".png", ".doc", ".docx"};
const int NUM_ALLOWED_EXTENSIONS = 6;

// ===== BOUDICA AI INTEGRATION =====
static inline
std::string call_boudica(std::string prompt) {
    // Get Boudica server config from environment or defaults
    const char* boudica_host = std::getenv("BOUDICA_HOST");
    const char* boudica_port = std::getenv("BOUDICA_PORT");
    const char* boudica_api_key = std::getenv("BOUDICA_API_KEY");
    
    std::string host = boudica_host ? boudica_host : "localhost";
    std::string port = boudica_port ? boudica_port : "8080";
    std::string api_key = boudica_api_key ? boudica_api_key : "";
    
    std::string url = "http://" + host + ":" + port + "/api/boudica/chat";
    
    // Build JSON payload
    std::string payload = "{\"prompt\":\"" + prompt + "\"";
    if (!api_key.empty()) {
        payload += ",\"api_key\":\"" + api_key + "\"";
    }
    payload += "}";
    
    // Use curl to send POST request
    std::string cmd = "curl -s -X POST '" + url + "' -H 'Content-Type: application/json' -d '" + payload + "'";
    
    std::string resp = OmniIndex::Utils::Utils::exec(cmd);
    return resp;
}

// Legacy Gemini function (deprecated, kept for compatibility)
static inline 
std::string call_gemini(std::string prompt) {
    // Now delegates to Boudica for AI-powered responses
    return call_boudica(prompt);
}



const inline
std::vector<std::string> create_search_strings(std::string search_text) {
    std::vector<std::string> strings;
    std::vector<std::string> words = OmniIndex::Utils::Utils::split(search_text, " ");
    std::random_device random_device;
    std::mt19937 generator(random_device());
    for ( size_t cur = 0; cur < words.size(); ++cur ) {
        std::shuffle(words.begin(), words.end(), generator);
        std::string tmp;
        for ( size_t pos = 0; pos < words.size(); ++pos ) {
            tmp += words[pos];
            if ( pos < words.size() - 1 ) {
                tmp += " ";
            }
        }
        tmp = OmniIndex::Utils::Utils::replace(tmp, " ", "%");
        strings.push_back(tmp);
    }
    do
    {
        std::string tmp;
        for ( size_t pos = 0; pos < words.size(); ++pos ) {
            tmp += words[pos];
            if ( pos < words.size() - 1 ) {
                tmp += " ";
            }
        }
        tmp = OmniIndex::Utils::Utils::replace(tmp, " ", "%");
        strings.push_back(tmp);
    }
    while (std::ranges::next_permutation(words.begin(), words.end()).found);
    return strings;
}

static inline
std::string get_barcode(std::string barcode) {
    std::string cmd = "curl https://api.barcodelookup.com/v3/products?barcode=" + barcode + "&formatted=n&key= ep3l7s9s27zhl4pajcg4a6tawn66ei";

    std::string resp = OmniIndex::Utils::Utils::exec(cmd);
    resp = OmniIndex::Utils::Utils::replace(resp, "\\n", "");

    resp = OmniIndex::Utils::Utils::replace(resp, "\\", "");
    resp = OmniIndex::Utils::Utils::replace(resp, "u003c", "<");
    resp = OmniIndex::Utils::Utils::replace(resp, "u003e", ">");
    resp = OmniIndex::Utils::Utils::replace(resp, "u0026", "&");
    resp = OmniIndex::Utils::Utils::replace(resp, "u0022", "\"");
    resp = OmniIndex::Utils::Utils::replace(resp, "u0027", "\'");
    return resp;
}

static inline 
std::string url_decode(std::string &req) {
    req = OmniIndex::Utils::Utils::replace(req, "+", " ");
    std::string ret;
    char ch;
    int i, ii;
    for (i=0; i<req.length(); i++) {
        if (int(req[i])==37) {
            sscanf(req.substr(i+1,2).c_str(), "%x", &ii);
            ch=static_cast<char>(ii);
            ret+=ch;
            i=i+2;
        } else {
            ret+=req[i];
        }
    }
    return (ret);
}

static inline 
std::string clean_value(std::string value) {
    value = OmniIndex::Utils::Utils::replace(value, ",", " ");
    value = OmniIndex::Utils::Utils::replace(value, "\"", " ");
    value = OmniIndex::Utils::Utils::replace(value, "'", " ");
    value = OmniIndex::Utils::Utils::replace(value, "(", " ");
    value = OmniIndex::Utils::Utils::replace(value, ")", " ");
    return value;    
}

/** This function will open the conf file and read the items inside placing them in to a
 * std::map<std::string, std::string>
 * @return std::map<std::string, std::string> 
 */
static inline
std::map<std::string, std::string> get_configuration() {
    std::map<std::string, std::string> configuration;
    std::string conf = OmniIndex::Utils::Utils::file_open("./boudica_pos.conf");
    if ( conf == "" ) {
        conf = OmniIndex::Utils::Utils::file_open("../boudica_pos.conf");
    }
    if ( conf == "" ) {
        conf = OmniIndex::Utils::Utils::file_open("/usr/lib/cgi-bin/boudica_pos.conf");
    }
    std::string tmp = conf;
    size_t sz_pos = tmp.find("\nserver ");
    if ( sz_pos != std::string::npos ) {
        tmp.erase(0, sz_pos + 8);
        sz_pos = tmp.find("\n");
        if ( sz_pos != std::string::npos ) {
            tmp.erase ( sz_pos );
        }
        OmniIndex::Utils::Utils::trim(tmp);
        configuration["server"]= tmp;
    }
    tmp = conf;
    sz_pos = tmp.find("\nport ");
    if ( sz_pos != std::string::npos ) {
        tmp.erase(0, sz_pos + 6);
        sz_pos = tmp.find("\n");
        if ( sz_pos != std::string::npos ) {
            tmp.erase ( sz_pos );
        }
        OmniIndex::Utils::Utils::trim(tmp);
        configuration["port"]= tmp;
    }
    tmp = conf;
    sz_pos = tmp.find("\ndatabase ");
    if ( sz_pos != std::string::npos ) {
        tmp.erase(0, sz_pos + 10);
        sz_pos = tmp.find("\n");
        if ( sz_pos != std::string::npos ) {
            tmp.erase ( sz_pos );
        }
        OmniIndex::Utils::Utils::trim(tmp);
        configuration["database"]= tmp;
    }    
    tmp = conf; 
    sz_pos = tmp.find("\nusername ");
    if ( sz_pos != std::string::npos ) {
        tmp.erase(0, sz_pos + 10);
        sz_pos = tmp.find("\n");
        if ( sz_pos != std::string::npos ) {
            tmp.erase ( sz_pos );
        }
        OmniIndex::Utils::Utils::trim(tmp);
        configuration["username"]= tmp;
    }
    tmp = conf; 
    sz_pos = tmp.find("\npassword ");
    if ( sz_pos != std::string::npos ) {
        tmp.erase(0, sz_pos + 10);
        sz_pos = tmp.find("\n");
        if ( sz_pos != std::string::npos ) {
            tmp.erase ( sz_pos );
        }
        OmniIndex::Utils::Utils::trim(tmp);
        configuration["password"]= tmp;
    } 
    tmp = conf; 
    sz_pos = tmp.find("\nroles ");
    if ( sz_pos != std::string::npos ) {
        tmp.erase(0, sz_pos + 7);
        sz_pos = tmp.find("\n");
        if ( sz_pos != std::string::npos ) {
            tmp.erase ( sz_pos );
        }
        OmniIndex::Utils::Utils::trim(tmp);
        configuration["roles"]= tmp;
    }
    tmp = conf; 
    sz_pos = tmp.find("\nroles_password ");
    if ( sz_pos != std::string::npos ) {
        tmp.erase(0, sz_pos + 16);
        sz_pos = tmp.find("\n");
        if ( sz_pos != std::string::npos ) {
            tmp.erase ( sz_pos );
        }
        OmniIndex::Utils::Utils::trim(tmp);
        configuration["roles_password"]= tmp;
    } 
    tmp = conf; 
    sz_pos = tmp.find("\nroles_chain ");
    if ( sz_pos != std::string::npos ) {
        tmp.erase(0, sz_pos + 13);
        sz_pos = tmp.find("\n");
        if ( sz_pos != std::string::npos ) {
            tmp.erase ( sz_pos );
        }
        OmniIndex::Utils::Utils::trim(tmp);
        configuration["roles_chain"]= tmp;
    } 
    tmp = conf;
    sz_pos = tmp.find("\nserver_whitelist ");
    if ( sz_pos != std::string::npos ) {
        tmp.erase(0, sz_pos + 18);
        sz_pos = tmp.find("\n");
        if ( sz_pos != std::string::npos ) {
            tmp.erase ( sz_pos );
        }
        OmniIndex::Utils::Utils::trim(tmp);
        configuration["server_whitelist"]= tmp;
    }
    tmp = conf;
    sz_pos = tmp.find("\nepos_user ");
    if ( sz_pos != std::string::npos ) {
        tmp.erase(0, sz_pos + 11);
        sz_pos = tmp.find("\n");
        if ( sz_pos != std::string::npos ) {
            tmp.erase ( sz_pos );
        }
        OmniIndex::Utils::Utils::trim(tmp);
        configuration["epos_user"]= tmp;
    } 
    tmp = conf;
    sz_pos = tmp.find("\nepos_password ");
    if ( sz_pos != std::string::npos ) {
        tmp.erase(0, sz_pos + 15);
        sz_pos = tmp.find("\n");
        if ( sz_pos != std::string::npos ) {
            tmp.erase ( sz_pos );
        }
        OmniIndex::Utils::Utils::trim(tmp);
        configuration["epos_password"]= tmp;
    }
    tmp = conf;
    sz_pos = tmp.find("\nstripe_secret_key ");
    if ( sz_pos != std::string::npos ) {
        tmp.erase(0, sz_pos + 19);
        sz_pos = tmp.find("\n");
        if ( sz_pos != std::string::npos ) {
            tmp.erase ( sz_pos );
        }
        OmniIndex::Utils::Utils::trim(tmp);
        configuration["stripe_secret_key"]= tmp;
    }                    
    return configuration;     
}


// Function to sanitize filename
std::string sanitizeFilename(const std::string& filename) {
    std::string sanitized = filename;
    std::replace_if(sanitized.begin(), sanitized.end(), 
        [](char c) { return !std::isalnum(c) && c != '.' && c != '_' && c != '-'; }, '_');
    return sanitized;
}

// Function to process the uploaded file
bool processUpload(const std::string& filename, const std::string& content) {
    try {
        // Create upload directory if it doesn't exist
        std::string mkdir_cmd = "mkdir -p " + UPLOAD_DIR;
        system(mkdir_cmd.c_str());

        // Sanitize filename
        std::string safe_filename = sanitizeFilename(filename);
        std::string filepath = UPLOAD_DIR + safe_filename;

        // Check file size
        if (content.length() > MAX_FILE_SIZE) {

            return false;
        }

        // Write file to disk
        std::ofstream file(filepath, std::ios::binary);
        if (!file) {

            return false;
        }

        file.write(content.c_str(), content.length());
        file.close();

        return true;
    } catch (const std::exception& e) {

        return false;
    }
}

// Function to parse multipart form data
std::vector<std::string> parseMultipartData(const std::string& data) {
    std::vector<std::string> result;
    std::string boundary = data.substr(0, data.find("\r\n"));
    
    size_t pos = 0;
    while ((pos = data.find(boundary, pos)) != std::string::npos) {
        size_t next_boundary = data.find(boundary, pos + boundary.length());
        if (next_boundary == std::string::npos) break;
        
        std::string part = data.substr(pos, next_boundary - pos);
        result.push_back(part);
        pos = next_boundary;
    }
    
    return result;
}

static inline
std::string check_user_credentials(std::string email_address, std::string password) {
    std::string user = email_address, domain = email_address, db_user = email_address;
    std::map<std::string, std::string> conf = get_configuration();    
    Postgresql pgbc = Postgresql(conf["username"], conf["password"] , conf["server"], conf["port"], "postgres" ); 
    if ( pgbc._isConnected ) {
        // Query new store.users table with password verification using pgcrypto
        std::string sql = "SELECT id, username, email, role, full_name, is_active FROM store.users "
                         "WHERE username = '" + email_address + "' AND is_active = true "
                         "AND password_hash = crypt('" + password + "', password_hash);";

        #ifdef DEBUG
        std::cout << sql << "\n\n";
        #endif
        std::string resp(pgbc.runCommand(sql));
        std::string warnings = pgbc.getWarnings();
        std::string error = pgbc.getLastError();
        pgbc.close(); 
        if ( error != "" ) {
            error = OmniIndex::Utils::Utils::replace(error, "\"", "'"); 
            error = OmniIndex::Utils::Utils::replace(error, "\n", " "); 
            resp =  "{\"response\": [], \"warnings\": \"\", \"errors\": \"" + error + "\"}";
            return resp;
        }
        JSON<std::string,std::string> json(resp);
        // Check if we got actual user data (successful password match)
        // If no match, response will have empty fields: {"id": "","username": "",...}
        if (resp.find("\"id\": \"\"") != std::string::npos) {
            resp =  "{\"response\": [], \"warnings\": \"\", \"errors\": \"Invalid credentials\"}";
            return resp;            
        }
        resp = OmniIndex::Utils::Utils::replace(resp, "{{", "{");
        resp = OmniIndex::Utils::Utils::replace(resp, "}}", "}");
        resp = "{\"response\": [" + resp + "], \"warnings\": \"\", \"errors\": \"\"}";
        resp = OmniIndex::Utils::Utils::replace(resp, "[{]", "[]");  
        return resp;      
    } else {
        return "{\"response': [] \"error\": \"PGBC connection failed\"}";
    }
}


static inline 
std::string pgbc_connection (const std::string user, const std::string password, const std::string server, const std::string database, const std::string port, const std::string query) {
    Postgresql pgbc = Postgresql( user, password, server, port, database ); 
    if ( pgbc._isConnected ) {
        std::string error, warning, resp;
        std::string lwr = query;
        OmniIndex::Utils::Utils::toLower(lwr);

        if ( lwr.find ("select") != std::string::npos ) {
            resp.assign(pgbc.runCommand(query));
            warning = pgbc.getWarnings();
            error = pgbc.getLastError();
            pgbc.close(); 
            return "{\"response\": \"" + resp + "\", \"warning\": \"" + warning + "\", \"error\": \"" + error + "\"}";             
        } else {
            int ret = pgbc.exec(query);
            warning = pgbc.getWarnings();
            error = pgbc.getLastError();
            pgbc.close(); 
            if ( ret == 1 ) {
                return "{\"response\": \"Ok\", \"warning\": \"" + warning + "\", \"error\": \"" + error + "\"}";                   
            } else {
                return "{\"response\": \"fail\", \"warning\": \"" + warning + "\", \"error\": \"" + error + "\"}"; 
            }             
        }
    } else {
        return "{\"error\": \"" + pgbc.getLastError() + "\"}";
    }
    return "{\"error\": \"Unknown error\"}";
}

/** Setup /supplier routines */
static inline
bool add_product(std::string supplier, const std::string barcode, const std::string rs_price, std::string description,
  const std::string user, const std::string password, const std::string database) {
    //supplierencrypt TEXT, product_description TEXT, rs_price NUMERIC,barcode TEXT
    description = clean_value(description); 
    supplier = clean_value(supplier);   
    std::string sql = "SELECT barcode, supplier, product_description FROM store.products WHERE supplier = '" + supplier + "' AND product_description = '" + description + "' ;";  
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return false;
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    
    if ( pgbc._isConnected ) {
        std::string error, warning;
        std::string resp(pgbc.runCommand(sql));
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != ""  ) {
            return false;
        }
        pgbc.close();
        JSON<std::string,std::string> jSupplier(resp);
        /** If we have this without a barcode we will deleet the original. */
        if ( jSupplier["supplier"] != "" && jSupplier["supplier"] != "null"  ) {
            sql = "DELETE FROM store.products WHERE barcode = '" + barcode + "';";
            Postgresql _pgbc = Postgresql( m_conf["username"], m_conf["password"], m_conf["server"], m_conf["port"], database ); 
            if ( _pgbc._isConnected ) {
                _pgbc.exec(sql);
            }
            _pgbc.close();
        }
        pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
        sql = "INSERT INTO store.products (supplier, product_description, rs_price, barcode) VALUES ('" + supplier + "','" + description + "'," + rs_price + ",'" + barcode + "');";  
        int i_resp = pgbc.exec(sql);
        if ( i_resp != 0 ) {
            pgbc.close();
            return false;
        }
        pgbc.close();
        return true;
    }
    return false;
} 

static inline
bool add_supplier(std::string supplier, std::string telephone, std::string address, const std::string postcode, const std::string supplier_email,
    const std::string user, const std::string password, const std::string database) {
    //store.suppliers (supplierencrypt TEXT, telephoneencrypt TEXT, addressencrypt TEXT, postcode TEXT);
    supplier = clean_value(supplier);  
    telephone = clean_value(telephone);  
    address = clean_value(address); 
    std::string sql = "INSERT INTO store.suppliers (supplier, telephone, address, postcode, emailaddress) VALUES ('" + supplier + "','" + telephone + "','" + address + "','" + postcode + "','" + supplier_email + "');";  
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return false;
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        std::string error, warning, resp;
        int i_resp = pgbc.exec(sql);
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" || i_resp != 0 ) {
            pgbc.close();
            return false;
        }
        pgbc.close();
        return true;
    }
    return false;    
}

static inline
std::string get_supplier_list(const std::string user, const std::string password, const std::string database) {
    //store.suppliers (supplierencrypt TEXT, telephoneencrypt TEXT, addressencrypt TEXT, postcode TEXT);
    std::string sql = "SELECT supplier FROM store.suppliers;";  
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return "{\"error\": \"System configuration error!\"}";  
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        std::string error, warning, resp;
        resp = pgbc.runCommand(sql);
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" ) {
            pgbc.close();
            return "{\"warning\": \"" + warning + "\", \"error\": \"" + error + "\"}";  
        }
        pgbc.close();
        JSON<std::string,std::string> jSupplier(resp);
        std::string response = "{\"suppliers\": [";
        for ( size_t sz_pos = 0; sz_pos < jSupplier.size(); sz_pos++) {
            if ( sz_pos > 0 ) {
                response += ",\"" + jSupplier[sz_pos] + "\"";
            } else {
                response += "\"" + jSupplier[sz_pos] + "\"";  
            }
        }
        response += "]}";
        std::string supplier = jSupplier["supplier"]; 
        OmniIndex::Utils::Utils::trim(supplier);
        return response;
    }
    return "";    
}

static inline
std::string get_workshops(const std::string user, const std::string password, const std::string database) {
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return "{\"error\": \"System configuration error!\"}";  
    }
    
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database );
    if ( !pgbc._isConnected ) {
        return "{\"error\": \"Database connection failed\"}";
    }
    
    // Get workshops where when_date >= today (CURRENT_DATE)
    std::string sql = "SELECT id, title, description, when_date, when_time, price FROM store.workshops WHERE when_date::DATE >= CURRENT_DATE ORDER BY when_date ASC;";  
    std::string resp = pgbc.runCommand(sql);
    std::string error = pgbc.getLastError();
    pgbc.close();
    
    if ( error != "" ) {
        return "{\"error\": \"" + error + "\"}";  
    }
    
    if ( resp.empty() || resp.find("\"id\"") == std::string::npos ) {
        return "{\"workshops\": []}";
    }
    
    // Parse response and build JSON array
    std::string workshops_json = "{\"workshops\": [";
    std::string temp_resp = resp;
    
    for ( size_t sz_start = temp_resp.find("{"); sz_start != std::string::npos; sz_start = temp_resp.find("{") ) {
        temp_resp.erase(0, sz_start + 1);
        size_t sz_end = temp_resp.find("}");
        if ( sz_end != std::string::npos ) {
            std::string workshop_record = temp_resp.substr(0, sz_end);
            temp_resp.erase(0, sz_end + 1);
            
            JSON<std::string,std::string> jWorkshop(workshop_record);
            std::string id = jWorkshop["id"];
            std::string title = jWorkshop["title"];
            std::string description = jWorkshop["description"];
            std::string when_date = jWorkshop["when_date"];
            std::string when_time = jWorkshop["when_time"];
            std::string price = jWorkshop["price"];
            
            OmniIndex::Utils::Utils::trim(id);
            OmniIndex::Utils::Utils::trim(title);
            OmniIndex::Utils::Utils::trim(description);
            OmniIndex::Utils::Utils::trim(when_date);
            OmniIndex::Utils::Utils::trim(when_time);
            OmniIndex::Utils::Utils::trim(price);
            
            if ( id.length() > 0 && title.length() > 0 ) {
                if ( workshops_json.back() != '[' ) {
                    workshops_json += ",";
                }
                workshops_json += "{\"id\": " + id + ", \"title\": \"" + title + "\", \"description\": \"" + description + "\", \"when_date\": \"" + when_date + "\", \"when_time\": \"" + when_time + "\", \"price\": " + price + "}";
            }
        }
    }
    
    workshops_json += "]}";
    return workshops_json;
}

static inline
bool add_invoice(std::string invoice_number, std::string supplier, std::string details, std::string amount, bool paid, 
    const std::string user, const std::string password, const std::string database) {
    //CREATE BLOCK store.suppliers_invoices (supplierencrypt TEXT, invoice_number TEXT, invoice_details TEXT, invoice_amout NUMERIC, paid_on TEXT);    
    supplier = clean_value(supplier);  
    invoice_number = clean_value(invoice_number);  
    details = clean_value(details); 
    std::string date = OmniIndex::Utils::Utils::getCurrentUTCTime();
    if ( !paid ) {
        date = "";
    }
    std::string sql = "INSERT INTO store.suppliers_invoices (supplier, invoice_number, invoice_details, invoice_amount, paid_on) VALUES ('" + supplier + "','" + invoice_number + "','" + details + "','" + amount + "','" + date + "');";  
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return false;
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        std::string error, warning, resp;
        int i_resp = pgbc.exec(sql);
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" || i_resp != 0 ) {
            pgbc.close();
            return false;
        }
        pgbc.close();
        return true;
    }
    return false;    
}

/** Day routines  */
static inline
bool set_float(std::string open_float, const std::string user, const std::string password, const std::string database) {
    std::string sql = "INSERT INTO store.till_float (cash_float) VALUES (" + open_float + ");";
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return false;
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        std::string error, warning;
        int i_resp = pgbc.exec(sql);
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" || i_resp != 0 ) {
            pgbc.close();
            return false;
        } else {
            pgbc.close();
            return true;
        }
    }
    return false;
}

static inline
std::string cash_up(const std::string user, const std::string password, const std::string database) {
    /** Here we need to get all of teh periods sales. We will do that by bar code and 
     * then we will set teh completed flag and take the running total.
     */
    std::string sql = "SELECT DISTINCT ON(barcode) barcode, running_total, quantity, type, supplier, completed, sale_date from store.period_sales WHERE completed = '1' ";  
    sql += "group by running_total, quantity, type, supplier, barcode, completed, sale_date ORDER BY barcode, quantity, type, supplier, completed, sale_date DESC;";
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return "{\"error\": \"System error confoigutaion file is missing!\"}";
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        double card_sales = 0.00, cash_sales = 0.00, unnacounted_sales = 0.00;
        std::string error, warning, resp;
        resp.assign(pgbc.runCommand(sql));
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" ) {
            pgbc.close();
            return "{\"error\": \"" + error +"\"}";
        }
        pgbc.close();
        std::map<std::string, std::map<std::string, std::string> > m_totals;
        resp = OmniIndex::Utils::Utils::replace(resp, "{{", "{");
        std::string response = "{";
        bool first_item = true;
        for ( size_t sz_start = resp.find("{"); sz_start != std::string::npos; sz_start = resp.find("{") ) {
            pgbc = Postgresql( m_conf["username"], m_conf["password"], m_conf["server"], m_conf["port"], database ); 
            resp.erase ( 0, sz_start + 1);
            size_t sz_end = resp.find("}");
            if ( sz_end != std::string::npos ) {
                std::string tmp = resp.substr(0, sz_end + 1);
                resp.erase(0, sz_end + 1);
                JSON<std::string,std::string> jProduct(tmp);
                /** Make sure that the object we are dealing with is older thanthe last update */
                if ( jProduct["completed"] == "1" ) {
                    sql = "UPDATE store.period_sales SET completed = '0' WHERE barcode = '" + jProduct["barcode"] + "';";
                     int i = pgbc.exec(sql);
                     warning = pgbc.getWarnings();
                     error = pgbc.getLastError();
                     if ( i > 0  ) {
                         //pgbc.close();
                        // return "{\"error\": \"" + error +"\"}";
                     }
                    std::string sale_type = jProduct["type"]; 
                    OmniIndex::Utils::Utils::toLower(sale_type);
                    if ( sale_type == "cash" ) {
                        cash_sales += std::stod(jProduct["running_total"]);
                    } else if ( sale_type == "card" ) {
                        card_sales += std::stod(jProduct["running_total"]);
                    } else {
                        cash_sales += std::stod(jProduct["running_total"]);
                    }
                }              
            }
            pgbc.close();
        }
        pgbc.close();
        sql = "SELECT cash_float FROM store.till_float ORDER BY float_date DESC LIMIT 1;";
        pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
        resp.assign(pgbc.runCommand(sql));
        JSON<std::string,std::string> jFloat(resp);
        long day_float = std::stod(jFloat["cash_float"]);
        long amount_since_last_close = (card_sales + cash_sales) - day_float;
        sql = "INSERT INTO store.cash_up (cash_float, takings, cash_sales, card_sales) VALUES (" + std::to_string(day_float) + "," + std::to_string(amount_since_last_close) + "," + std::to_string(cash_sales) + "," + std::to_string(std::round(card_sales*100)/100) + ");";
        
        int i_resp = pgbc.exec(sql);
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        pgbc.close();
        
        return response + "\"total\": \"" + std::to_string(amount_since_last_close) + "\", \"card_sales\": \"" + std::to_string(std::round(card_sales*100)/100) + "\", \"cash_sales\": \"" + std::to_string(std::round(cash_sales*100)/100) + "\"}\n\n";        
    } else {
        return "{\"total\": \"Undetermined\", \"card_sales\": \"Undetermined\", \"cash_sales\": \"undetermined\", \"unnacounted_sales\": \"undetermined\"}\n\n";    
    }
    return "{\"card_sales\": \"Undetermined\", \"cash_sales\": \"undetermined\", \"unnacounted_sales\": \"undetermined\"}\n\n";   
}

/** Stock Routines */
static inline
bool update_stock(const std::string barcode, std::string quantity,
  const std::string user, const std::string password, const std::string database) {
    std::string stock_take = "DELETE FROM store.stock_take WHERE barcode = '" + barcode + "';";/** Clean up no need for a Web 3 thngnymagig here */
    std::string sql = "SELECT quantity, available FROM store.stock WHERE barcode = '" + barcode + "' LIMIT 1;";
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return false;
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        std::string error, warning;
        std::string resp(pgbc.runCommand(sql));
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" ) {
            pgbc.close();
            return false;
        }
        JSON<std::string,std::string> jStock(resp);
        std::string current_qty = jStock["quantity"];
        OmniIndex::Utils::Utils::trim(current_qty);
        size_t sz_len = current_qty.length();
        if ( current_qty.length() < 1 ) {
            current_qty = "0";
        }
        /** Are we adding or subtracting? */
        long total_quantity = 0;
        std::string tmp = quantity;

        if ( tmp.find("-") != std::string::npos ) {
            tmp.erase ( 0, 1);
            total_quantity = std::stol(current_qty) - std::stol(tmp);
        } else {
            total_quantity = std::stol(current_qty) + std::stol(quantity);
        }
        std::string current_ava = jStock["quantity"];
        OmniIndex::Utils::Utils::trim(current_ava);
        sz_len = current_ava.length();
        if ( current_ava.length() < 1 ) {
            current_ava = "0";
        }
        /** Are we adding or subtracting? */
        long total_available = 0;

        if ( quantity.find("-") != std::string::npos ) {
            quantity.erase ( 0, 1);
            total_quantity = std::stol(current_ava) - std::stol(quantity);
        } else {
            total_available = std::stol(current_ava) + std::stol(quantity);
        }
        pgbc.close();
        pgbc = Postgresql( m_conf["username"], m_conf["password"], m_conf["server"], m_conf["port"], database ); 
        if ( pgbc._isConnected ) {
            std::string error, warning;
            pgbc.runCommand(stock_take);
        }
        pgbc.close();
        pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database );         
        sql = "INSERT INTO store.stock (quantity,  available, barcode) VALUES (" + std::to_string(total_quantity) + "," + std::to_string(total_available) + ",'" + barcode + "');";
        int i_resp = pgbc.exec(sql);
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" || i_resp != 0 ) {
            pgbc.close();
            return false;
        }
        pgbc.close(); 
        return true;
    }
    return false;
} 

static inline
bool move_stock_out(const std::string supplier,const std::string barcode, std::string quantity, std::string reason,
  const std::string user, const std::string password, const std::string database) {
    std::string sql = "SELECT quantity, available FROM store.stock WHERE barcode = '" + barcode + "';";
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return false;
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        std::string error, warning;
        std::string resp(pgbc.runCommand(sql));
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" ) {
            pgbc.close();
            return false;
        }
        JSON<std::string,std::string> jStock(resp);
        std::string current_qty = jStock["quantity"];
        OmniIndex::Utils::Utils::trim(current_qty);
        size_t sz_len = current_qty.length();
        if ( current_qty.length() < 1 ) {
            current_qty = "0";
        }
        /** Are we adding or subtracting? */
        long total_quantity = 0;
        total_quantity = std::stol(current_qty);

        std::string current_ava = jStock["available"];
        OmniIndex::Utils::Utils::trim(current_ava);
        sz_len = current_ava.length();
        if ( current_ava.length() < 1 ) {
            current_ava = "0";
        }
        /** Are we adding or subtracting? */
        long total_available = 0;
        total_available = std::stol(current_ava) - std::stol(quantity);

        sql = "INSERT INTO store.stock_removal (quantity, barcode, reason) VALUES (" + std::to_string(total_quantity) + ",'" + barcode + "','" + reason + "');";
        int i_resp = pgbc.exec(sql);
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" || i_resp != 0 ) {
            pgbc.close();
            return false;
        } 
        sql = "INSERT INTO store.stock (quantity,  available, barcode) VALUES ('" + std::to_string(total_quantity) + "," + std::to_string(total_available) + ",'" + barcode + "');";
        i_resp = pgbc.exec(sql);
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" || i_resp != 0 ) {
            pgbc.close();
            return false;
        } 
        pgbc.close();        
        return true;
    }
    return false;  
}

static inline
bool move_stock_in(const std::string supplier,const std::string barcode, std::string quantity, std::string reason,
  const std::string user, const std::string password, const std::string database) {
    std::string sql = "SELECT quantity, available FROM store.stock WHERE barcode = '" + barcode + "';";
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return false;
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        std::string error, warning;
        std::string resp(pgbc.runCommand(sql));
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" ) {
            pgbc.close();
            return false;
        }
        JSON<std::string,std::string> jStock(resp);
        std::string current_qty = jStock["quantity"];
        OmniIndex::Utils::Utils::trim(current_qty);
        size_t sz_len = current_qty.length();
        if ( current_qty.length() < 1 ) {
            current_qty = "0";
        }
        /** Are we adding or subtracting? */
        long total_quantity = 0;
        total_quantity = std::stol(current_qty);

        std::string current_ava = jStock["available"];
        OmniIndex::Utils::Utils::trim(current_ava);
        sz_len = current_ava.length();
        if ( current_ava.length() < 1 ) {
            current_ava = "0";
        }
        /** Are we adding or subtracting? */
        long total_available = 0;
        total_available = std::stol(current_ava) + std::stol(quantity);

        sql = "INSERT INTO store.stock_removal (returned_quantity, barcode, reason) VALUES (" + std::to_string(total_quantity) + "','" + barcode + "','" + reason + "');";
        int i_resp = pgbc.exec(sql);
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" || i_resp != 0 ) {
            pgbc.close();
            return false;
        } 
        sql = "INSERT INTO store.stock (quantity,  available, barcode) VALUES ('" + std::to_string(total_quantity) + "," + std::to_string(total_available) + ",'" + barcode + "');";
        i_resp = pgbc.exec(sql);
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" || i_resp != 0 ) {
            pgbc.close();
            return false;
        } 
        pgbc.close();        
        return true;
    }
    return false;  
}

/** Sales routines */

static inline
bool update_sale(const std::string bar_code, const std::string rs_price, std::string quantity, std::string type,
   const std::string user, const std::string password, const std::string database) {
    //shop.period_sales (supplierencrypt TEXT, rs_price NUMERIC, quantity NUMERIC, barcode TEXT, type, TEXT, completed char(1));
    //shop.products (supplierencrypt TEXT, product_description TEXT, rs_price NUMERIC,barcode TEXT);
    /** First we need to know who the supplier is */
    std::string sql = "SELECT supplier FROM store.products WHERE barcode = '" + bar_code + "';";
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return false;
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        std::string error, warning, resp;
        resp.assign(pgbc.runCommand(sql));
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" ) {
            pgbc.close();
            return false;
        }
        JSON<std::string,std::string> jSupplier(resp);
        std::string supplier = jSupplier["supplier"];  
        sql = "SELECT quantity, running_total, completed FROM store.period_sales WHERE barcode = '" + bar_code + "' ORDER BY sale_date DESC LIMIT 1;";  
        resp.assign(pgbc.runCommand(sql));
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" ) {
            pgbc.close();
            return false;
        }
        JSON<std::string,std::string> jProduct(resp);
        long total_quantity = 0;
        double total_rs_price = 0.00;
        if ( jProduct["completed"] == "0") {
            total_quantity = 0;
            total_rs_price = 0.00;
        } else {
            std::string tmp = jProduct["quantity"];
            OmniIndex::Utils::Utils::trim(tmp);
            if ( tmp.length() <= 0 ) {
                quantity = "0";
            } else{
                quantity = tmp;
            }
            std::string tmp2 = jProduct["running_total"];
            OmniIndex::Utils::Utils::trim(tmp2);
            if ( tmp2.length() <= 0 ) {
                tmp2 = "0.00";
            }        
            // total_quantity = std::stol(tmp);
            total_quantity += std::stol(quantity);
            total_rs_price = std::stod(tmp2);
            total_rs_price += std::stod(rs_price);
            total_rs_price = std::round(total_rs_price*100)/100;
            /** Now update it all */
            if ( supplier == "" || supplier == "null" ) {
                supplier = "UNKNOWN";
            }
            sql = "INSERT INTO store.period_sales (supplier, running_total, quantity, barcode, type, completed) VALUES ('" + supplier + "," + std::to_string(total_rs_price) + "," + std::to_string(total_quantity) + ",'" + bar_code + "','" + type + "','1');";
            pgbc.close();
            pgbc = Postgresql( m_conf["username"], m_conf["password"], m_conf["server"], m_conf["port"], database ); 
            std::string up_sql = "UPDATE store.period_sales SET completed='0' WHERE barcode = '" + bar_code + "';";
            int i_resp = pgbc.exec(up_sql);
            warning = pgbc.getWarnings();
            error = pgbc.getLastError();
            // if ( error != "" || i_resp != 0 ) {
            //     pgbc.close();
            //     return false;
            // }
            pgbc.close();
            pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
            i_resp = pgbc.exec(sql);
            warning = pgbc.getWarnings();
            error = pgbc.getLastError();
             if ( error != "" || i_resp != 0 ) {
                 pgbc.close();
             }   
            quantity = "-" + quantity;
            if ( update_stock(bar_code, quantity, user, password, database)) {
                return true;
            }
            return false;
        }                   
    } else {
        return false;
    }
    return false;
}

static inline
std::string get_price(const std::string barcde, const std::string user, 
  const std::string password, const std::string database) {
    std::string sql = "SELECT rs_price FROM store.products WHERE barcode = '" + barcde + "';";
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return "{\"error\": \"System error configutaion file is missing!\"}";
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        std::string error, warning, resp;
        resp.assign(pgbc.runCommand(sql));
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" ) {
            pgbc.close();
            return "{\"error\": \"Could not connect to the system. The error was: " + error + "\"}";
        }
        pgbc.close();
        JSON<std::string,std::string> jSupplier(resp);
        std::string rs_price = jSupplier["rs_price"]; 
        OmniIndex::Utils::Utils::trim(rs_price);
        return "{\"rs_price\": \"" + rs_price + "\"}";
    }
    std::string error = pgbc.getLastError();
    pgbc.close();
    return "{\"error\": \"Could not connect to the system. The error was: " + error + "\"}";
}

static inline
std::string get_details(std::string barcode, const std::string user, 
  const std::string password, const std::string database) {

    // std::cout << get_barcode("3026980310127") << "\n";
    // return "";
    std::string description = barcode;
    OmniIndex::Utils::Utils::toLower(description);
    OmniIndex::Utils::Utils::trim(description);
    //description = OmniIndex::Utils::Utils::replace(description, " ", "%");
    std::vector<std::string> descriptions = create_search_strings(description);
    std::string search_ranges = "";
    for ( size_t pos = 0; pos < descriptions.size(); ++pos) {
        search_ranges +=  " OR p.product_description ILIKE '%" + descriptions[pos] + "%'";
    }
    std::string sql = "SELECT p.rs_price, s.quantity, s.available, s.barcode, p.supplier, p.product_description, p.color, p.type FROM store.stock AS s INNER JOIN store.products AS p ON s.barcode = p.barcode WHERE p.barcode = '" + barcode + "' ";
    sql += search_ranges + " ORDER BY p.modified_date DESC;";
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return "{\"error\": \"System error confoigutaion file is missing!\"}";
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        std::string error, warning, resp;
        resp.assign(pgbc.runCommand(sql));
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" ) {
            pgbc.close();
            return "{\"error\": \"Could not connect to the system. The error was: " + error + "\"}";
        }
        
        JSON<std::string,std::string> jSupplier(resp);
        std::string rs_price = jSupplier["rs_price"]; 
        OmniIndex::Utils::Utils::trim(rs_price);
        /** This may not be an actual stock item. In wihich case */
        if ( rs_price == "" ) {
            search_ranges = "";
            for ( size_t pos = 0; pos < descriptions.size(); ++pos) {
                if ( pos == 0 ) {
                     search_ranges +=  " product_description ILIKE '%" + descriptions[pos] + "%'";
                } else {
                     search_ranges +=  " OR product_description ILIKE '%" + descriptions[pos] + "%'";
                }
            }


            sql = "SELECT rs_price, barcode, supplier, product_description, color, type FROM store.products WHERE barcode = '" + barcode + "' OR (";
            sql += search_ranges + " OR store.products.supplier ILIKE '%" + barcode + "%' ) ORDER BY modified_date DESC;";
            resp.assign(pgbc.runCommand(sql));
            warning = pgbc.getWarnings();
            error = pgbc.getLastError();
            if ( error != "" ) {
                pgbc.close();
                return "{\"error\": \"Could not connect to the system. The error was: " + error + "\"}";
            }
            
            JSON<std::string,std::string> jSupplier(resp);
            pgbc.close();
            std::cout << "{\"products_search_details\": [";
            std::map<std::string, std::map<std::string, std::string> > m_totals;
            for ( size_t sz_start = resp.find("}"); sz_start != std::string::npos; sz_start = resp.find("}")) {
                std::map<std::string, std::string> m_details;
                std::string iter = resp.substr(0, sz_start + 1);
                iter = OmniIndex::Utils::Utils::replace(iter, "{{", "{");
                resp.erase ( 0, sz_start + 1);     
                JSON<std::string,std::string> jData(iter);
                std::string product_description = jData["product_description"];
                OmniIndex::Utils::Utils::trim(product_description); 
                std::string price = jData["rs_price"];
                OmniIndex::Utils::Utils::trim(price);                   
                barcode = jData["barcode"];
                OmniIndex::Utils::Utils::trim(barcode); 
                std::string color = jData["color"];
                OmniIndex::Utils::Utils::trim(color);      
                std::string type = jData["type"];
                OmniIndex::Utils::Utils::trim(type);
                std::string supplier = jData["supplier"];
                OmniIndex::Utils::Utils::trim(supplier);                
                std::string quantity = jData["quantity"];
                OmniIndex::Utils::Utils::trim(quantity);
                std::string available = jData["available"];
                OmniIndex::Utils::Utils::trim(available);
                
                std::cout << "{\"barcode\": \"" + barcode + "\",";
                std::cout <<  "\"supplier\": \"" + supplier + "\",";
                std::cout << "\"description\": \"" + product_description + "\",";
                std::cout << "\"color\": \"" + color + "\",";
                std::cout << "\"type\": \"" + type+ "\",";
                std::cout << "\"stock\": \"" + quantity + "\",";
                std::cout << "\"available\": \"" + available + "\",";
                std::cout << "\"price\": \"" + price + "\"}";
                if ( resp.find("\"barcode\"") != std::string::npos ) {
                    std::cout << "," << std::flush;
                } else {
                    break; 
                }
            }
            std::cout << "]}\n\n";
            return ""; 
        } else {
            pgbc.close();

            std::cout << "{\"products_search_details\": [";
            std::map<std::string, std::map<std::string, std::string> > m_totals;
            for ( size_t sz_start = resp.find("}"); sz_start != std::string::npos; sz_start = resp.find("}")) {
                std::map<std::string, std::string> m_details;
                std::string iter = resp.substr(0, sz_start + 1);
                iter = OmniIndex::Utils::Utils::replace(iter, "{{", "{");
                resp.erase ( 0, sz_start + 1);     
                JSON<std::string,std::string> jData(iter);
                std::string product_description = jData["product_description"];
                OmniIndex::Utils::Utils::trim(product_description); 
                std::string price = jData["rs_price"];
                OmniIndex::Utils::Utils::trim(price);                   
                barcode = jData["barcode"];
                OmniIndex::Utils::Utils::trim(barcode); 
                std::string color = jData["color"];
                OmniIndex::Utils::Utils::trim(color);      
                std::string type = jData["type"];
                OmniIndex::Utils::Utils::trim(type);
                std::string supplier = jData["supplier"];
                OmniIndex::Utils::Utils::trim(supplier);                
                std::string quantity = jData["quantity"];
                OmniIndex::Utils::Utils::trim(quantity);
                std::string available = jData["available"];
                OmniIndex::Utils::Utils::trim(available);
                
                std::cout << "{\"barcode\": \"" + barcode + "\",";
                std::cout <<  "\"supplier\": \"" + supplier + "\",";
                std::cout << "\"description\": \"" + product_description + "\",";
                std::cout << "\"color\": \"" + color + "\",";
                std::cout << "\"type\": \"" + type+ "\",";
                std::cout << "\"stock\": \"" + quantity + "\",";
                std::cout << "\"available\": \"" + available + "\",";
                std::cout << "\"price\": \"" + price + "\"}";
                if ( resp.find("\"barcode\"") != std::string::npos ) {
                    std::cout << "," << std::flush;
                } else {
                    break; 
                }
            }
            std::cout << "]}\n\n";
            return ""; 
        }
    }
    std::string error = pgbc.getLastError();
    pgbc.close();
    return "{\"error\": \"Could not connect to the system. The error was: " + error + "\"}";
}

static inline
std::string get_stock_count(const std::string barcde, const std::string user, 
  const std::string password, const std::string database) {
    std::string sql = "SELECT quantity FROM store.stock WHERE barcode = '" + barcde + "';";
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return "{\"error\": \"System error confoigutaion file is missing!\"}";
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        std::string error, warning, resp;
        resp.assign(pgbc.runCommand(sql));
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" ) {
            pgbc.close();
            return "{\"error\": \"Could not connect to the system. The error was: " + error + "\"}";
        }
        pgbc.close();
        JSON<std::string,std::string> jSupplier(resp);
        std::string quantity = jSupplier["quantity"]; 
        OmniIndex::Utils::Utils::trim(quantity);
        return "{\"quantity\": \"" + quantity + "\"}";
    }
    std::string error = pgbc.getLastError();
    pgbc.close();
    return "{\"error\": \"Could not connect to the system. The error was: " + error + "\"}";
}


static inline
std::string get_dashboard(const std::string user, 
  const std::string password, const std::string database) {
  std::string sql = "SELECT SUM(running_total) today_total  FROM store.period_sales WHERE completed = '1';";
  std::map<std::string, std::string> m_conf = get_configuration();
  Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
  if ( pgbc._isConnected ) {
    std::string error, warning;
    std::string resp(pgbc.runCommand(sql));
    warning = pgbc.getWarnings();
    error = pgbc.getLastError();
    if ( error != "" ) {
        pgbc.close();
        return "";
    }
    JSON<std::string,std::string> jToday(resp);
    std::string today = jToday["today_total"];
    OmniIndex::Utils::Utils::trim(today);
    size_t decimal = today.find(".");
    if ( decimal != std::string::npos ) {
        if ( decimal < today.length() + 2 ) {
            today.erase ( decimal + 3);
        }
    }
    std::string response = "{\"today_total\": \"" + today + "\"";
    pgbc.close();
    sql = "SELECT takings, cashup_date FROM store.cash_up WHERE cashup_date > current_date - interval '7 days';";
    resp.assign(pgbc.runCommand(sql));
    warning = pgbc.getWarnings();
    error = pgbc.getLastError();
    for ( size_t sz_start = resp.find("{"); sz_start != std::string::npos; sz_start = resp.find("{") ) {
        resp.erase ( 0, sz_start + 1);
        size_t sz_end = resp.find("}");
        if ( sz_end != std::string::npos ) {
            std::string tmp = resp.substr(0, sz_end + 1);
            resp.erase(0, sz_end + 1);
            JSON<std::string,std::string> jDailies(tmp);    
            std::string daily = jDailies["today_total"];
            OmniIndex::Utils::Utils::trim(daily);    
            decimal = daily.find(".");
            if ( decimal != std::string::npos ) {
                if ( decimal < daily.length() + 2 ) {
                    daily.erase ( decimal + 3);
                }
            }
            std::string date = jDailies["modified_date"];
            date = clean_value(date);
            OmniIndex::Utils::Utils::trim(date);
            if ( daily != "" || daily != "null" ) {
                response += ", \"" + date + "\": \"" + daily + "\"";
            }
        }
    }
    response += "}";
    return response;
  }
  return "{\"today_total\": \"\"}";
}


static inline
std::string stock_take(const std::string barcode, const std::string user, 
  const std::string password, const std::string database) {
    // if ( barcode.length() > 12 ) {
    //     return "";
    // }
    std::string quantity = "1";
    std::string sql = "SELECT quantity FROM store.stock_take WHERE barcode = '" + barcode + "' ORDER BY counted_at DESC LIMIT 1;";
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return "";
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        std::string error, warning;
        std::string resp(pgbc.runCommand(sql));
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" ) {
            pgbc.close();
            return "";
        }
        JSON<std::string,std::string> jStock(resp);
        std::string current_qty = jStock["quantity"];
        OmniIndex::Utils::Utils::trim(current_qty);
        size_t sz_len = current_qty.length();
        if ( current_qty.length() < 1 ) {
            current_qty = "0";
        }
        /** Are we adding or subtracting? */
        long total_quantity = 0;
        std::string tmp = quantity;

        if ( tmp.find("-") != std::string::npos ) {
            tmp.erase ( 0, 1);
            total_quantity = std::stol(current_qty) - std::stol(tmp);
        } else {
            total_quantity = std::stol(current_qty) + std::stol(quantity);
        }
        
        sql = "INSERT INTO store.stock_take (quantity, barcode) VALUES (" + std::to_string(total_quantity) + ",'" + barcode + "');";
        int i_resp = pgbc.exec(sql);
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" || i_resp != 0 ) {
            pgbc.close();
            return "";
        }

        sql = "SELECT quantity FROM store.stock WHERE barcode = '" + barcode + "';";
        resp.assign(pgbc.runCommand(sql));
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" ) {
            pgbc.close();
            return "";
        }
        JSON<std::string,std::string> jCurrentStock(resp);
        current_qty = jCurrentStock["quantity"];
        OmniIndex::Utils::Utils::trim(current_qty);
        pgbc.close();
        std::string resp_string = "{\"shelf\": \"" + std::to_string(total_quantity) + "\", \"stock\": \"" + current_qty + "\"}";        
        return resp_string;
    }
    return "";    
}

static inline
bool complete_stock_take(const std::string user, 
  const std::string password, const std::string database) {
    std::string sql = "SELECT DISTINCT( COUNT( barcode) ) AS count, barcode FROM store.stock_take GROUP BY barcode;";
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return false;
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        std::string error, warning;
        std::string resp(pgbc.runCommand(sql));
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" ) {
            pgbc.close();
            return false;
        }
        pgbc.close();/** We need to pool  */
        int false_pool_count = 0;
        std::cout << "{\"stock_count_details\": [";
        std::map<std::string, std::map<std::string, std::string> > m_totals;
        for ( size_t sz_start = resp.find("}"); sz_start != std::string::npos; sz_start = resp.find("}")) {
            std::map<std::string, std::string> m_details;
            std::string iter = resp.substr(0, sz_start + 1);
            iter = OmniIndex::Utils::Utils::replace(iter, "{{", "{");
            resp.erase ( 0, sz_start + 1);
            JSON<std::string,std::string> jStock(iter);
            std::string barcode = jStock["barcode"];
            std::string quantity = jStock["count"];
            long count = 0;
            if ( quantity.length() < 1 ) {
                count = 0;
                quantity = "0";
            } else {
                count = std::stol(quantity);
            }
            m_details.insert(std::pair<std::string, std::string>("counted", quantity));
            if ( false_pool_count == 0 ) {
                pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
            }
            sql = "SELECT p.supplier, p.product_description, p.color, p.type, s.quantity FROM store.products AS p JOIN store.stock AS s ON p.barcode = s.barcode WHERE p.barcode = '" + barcode + "';";
            std::string resp_data(pgbc.runCommand(sql));
            false_pool_count++;
            if ( false_pool_count == 50 ) {
                pgbc.close();
                false_pool_count = 0;
            }
            
            JSON<std::string,std::string> jData(resp_data);
            std::string current_qty = jData["quantity"];
            OmniIndex::Utils::Utils::trim(current_qty);
            long current_quantity = 0;
            if ( current_qty.length() < 1 ) {
                current_quantity = 0;
                current_qty = "0";
            } else {
                current_quantity = std::stol(current_qty);
            }
            std::string product_description = jData["product_description"];
            OmniIndex::Utils::Utils::trim(product_description);           
            std::string color = jData["color"];
            OmniIndex::Utils::Utils::trim(color);      
            std::string type = jData["type"];
            OmniIndex::Utils::Utils::trim(type);
            std::string supplier = jData["supplier_encrypt"];
            OmniIndex::Utils::Utils::trim(supplier);
            std::string difference = std::to_string(current_quantity - count); 
            if ( quantity != "0" && difference != "0" ) {
                std::cout << "{\"barcode\": \"" + barcode + "\",";
                std::cout <<  "\"supplier\": \"" + supplier + "\",";
                std::cout << "\"description\": \"" + product_description + "\",";
                std::cout << "\"color\": \"" + color + "\",";
                std::cout << "\"type\": \"" + type+ "\",";
                std::cout << "\"counted\": \"" + quantity + "\",";
                std::cout << "\"stock\": \"" + current_qty + "\",";
                std::cout << "\"descrepency\": \"" + difference + "\"}";
                if ( resp.find("\"barcode\"") != std::string::npos ) {
                    std::cout << "," << std::flush;
                }
            }

        }
        std::cout << "]}\n\n";
        return true;
    } 
   // }
    return false;    
}

static inline
bool add_user(const std::string user, const std::string new_user, const std::string  new_password, std::string  address, const std::string zip_code,
    const std::string  telephone, const std::string  first_name, const std::string last_name, const std::string  password, const std::string  database) {
        /** Does this user exist */
        std::string sql = "SELECT point_number FROM store.customers WHERE email ILIKE '%" + new_user + "%' ;";
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return false;
    }
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        std::string error, warning;
        std::string resp(pgbc.runCommand(sql));
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        pgbc.close();/** We need to pool  */
        if ( error != "" ) {
            return false;
        }
        JSON<std::string,std::string> jUser(resp);
        std::string points = jUser["point_number"];  
        if ( points.length() > 4 ) {
            return false;
        }
        /** get teh points number */    
        points = OmniIndex::Utils::Utils::create_ean_code();
        address = clean_value(address);
        sql = "INSERT INTO store.customers(email, password, address, postcode, telephone, name, surname, point_number) VALUES ('" + new_user + "','" + new_password + "','" + address + "','" + zip_code + "','" + telephone + "','" + first_name + "','" + last_name + "','" + points + "');";   
        pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
        int i_resp = pgbc.exec(sql);
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != "" || i_resp != 0 ) {
            pgbc.close();
            return false;
        }
        /** test teh insert */
        sql = "SELECT point_number FROM store.customers WHERE email ILIKE '%" + new_user + "%' ;";
        resp.assign(pgbc.runCommand(sql));
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();
        if ( error != ""  ) {
            pgbc.close();
            return false;
        }
        JSON<std::string,std::string> jNewUser(resp);
        std::string new_points = jNewUser["point_number"]; 
        if ( new_points.length() < 3 ) {
            return false;
        } 
        sql = "INSERT INTO store.reward_points (point_number, points_earned, points_used, points_remaining) VALUES ('" + points + "',0,0,0);";
        i_resp = pgbc.exec(sql);
        warning = pgbc.getWarnings();
        error = pgbc.getLastError();            
        return true;
    }
    return false;        
}

static inline 
std::string get_advice(std::string prompt) {
    prompt += " Please provide a detailed response to the question, and only respond with craft advice. Format as HTML please";
    std::string response = call_boudica(prompt);
    OmniIndex::Utils::Utils::trim(response);
    if ( response.length() < 1 ) {
        return "Could not get a response from the AI system.";
    }
    return response;
}

// ===== SALES FORECASTING FUNCTIONS =====

/**
 * Query database for sales data from same day of week (last N occurrences)
 * e.g., if today is Thursday, get last 10 Thursdays
 */
static inline
std::string forecast_daily_sales(std::string db_user, std::string db_pass, std::string db_name) {
    // Get current day of week (0=Sunday, 6=Saturday)
    time_t now = time(nullptr);
    struct tm* timeinfo = localtime(&now);
    int current_dow = timeinfo->tm_wday;
    
    // Query last 10 same day of week sales
    std::string sql = "SELECT SUM(quantity) as total_qty, COUNT(DISTINCT DATE(sale_date)) as num_days, "
                     "AVG(running_total) as avg_total "
                     "FROM store.period_sales "
                     "WHERE EXTRACT(DOW FROM sale_date) = " + std::to_string(current_dow) + " "
                     "AND sale_date > NOW() - INTERVAL '70 days' "
                     "AND completed = '1' "
                     "ORDER BY sale_date DESC "
                     "LIMIT 10";
    
    return sql;
}

/**
 * Query database for sales data from same week of year (last N occurrences)
 */
static inline
std::string forecast_weekly_sales(std::string db_user, std::string db_pass, std::string db_name) {
    // Query last 10 same weeks sales
    std::string sql = "SELECT SUM(quantity) as total_qty, COUNT(DISTINCT DATE(sale_date)) as num_days, "
                     "AVG(running_total) as avg_total "
                     "FROM store.period_sales "
                     "WHERE EXTRACT(WEEK FROM sale_date) = EXTRACT(WEEK FROM NOW()) "
                     "AND sale_date > NOW() - INTERVAL '70 weeks' "
                     "AND completed = '1' "
                     "GROUP BY EXTRACT(WEEK FROM sale_date) "
                     "ORDER BY sale_date DESC "
                     "LIMIT 10";
    
    return sql;
}

/**
 * Query database for sales data from same month (last N occurrences)
 */
static inline
std::string forecast_monthly_sales(std::string db_user, std::string db_pass, std::string db_name) {
    // Query last 10 same months sales
    std::string sql = "SELECT SUM(quantity) as total_qty, COUNT(DISTINCT DATE(sale_date)) as num_days, "
                     "AVG(running_total) as avg_total "
                     "FROM store.period_sales "
                     "WHERE EXTRACT(MONTH FROM sale_date) = EXTRACT(MONTH FROM NOW()) "
                     "AND sale_date > NOW() - INTERVAL '10 years' "
                     "AND completed = '1' "
                     "GROUP BY EXTRACT(MONTH FROM sale_date), EXTRACT(YEAR FROM sale_date) "
                     "ORDER BY sale_date DESC "
                     "LIMIT 10";
    
    return sql;
}

/**
 * Predict when an item needs reordering based on sales velocity and stock level
 */
static inline
std::string predict_reorder_date(std::string barcode, std::string db_user, std::string db_pass, std::string db_name) {
    std::string sql = "SELECT p.product_description, s.quantity, s.available, "
                     "EXTRACT(EPOCH FROM (NOW() - MAX(ps.sale_date)))/86400 as days_since_last_sale, "
                     "AVG(ps.quantity) as avg_daily_sales "
                     "FROM store.products p "
                     "LEFT JOIN store.stock s ON p.barcode = s.barcode "
                     "LEFT JOIN store.period_sales ps ON p.barcode = ps.barcode "
                     "WHERE p.barcode = '" + barcode + "' "
                     "AND ps.sale_date > NOW() - INTERVAL '30 days' "
                     "GROUP BY p.id, p.product_description, s.quantity, s.available";
    
    return sql;
}

/** Web Store Order Recording */
static inline
std::string record_web_store_order(std::string order_id, std::string customer_email, std::string items_json, 
                                   std::string total_value, const std::string user, const std::string password, 
                                   const std::string database) {
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return "{\"error\": \"System configuration error!\"}";
    }
    
    // Calculate VAT (20% UK standard rate)
    double total = std::stod(total_value);
    double vat_rate = 0.20;  // 20% VAT
    double vat_amount = total * vat_rate / (1 + vat_rate);  // Back-calculate VAT from total (includes VAT)
    double subtotal = total - vat_amount;
    
    /** Insert order into customer_orders */
    std::string order_date = OmniIndex::Utils::Utils::getCurrentUTCTime();
    std::string sql = "INSERT INTO store.customer_orders (order_id, email, items, total_value, payment_method, order_status, order_date, subtotal, vat_amount, vat_rate) VALUES ('" 
                    + order_id + "','" + customer_email + "','" + items_json + "'," + total_value + ",'card','completed','" + order_date + "'," 
                    + std::to_string(subtotal) + "," + std::to_string(vat_amount) + "," + std::to_string(vat_rate) + ");";
    
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database ); 
    if ( pgbc._isConnected ) {
        int i_resp = pgbc.exec(sql);
        std::string warning = pgbc.getWarnings();
        std::string error = pgbc.getLastError();
        
        if ( error != "" || i_resp != 0 ) {
            pgbc.close();
            return "{\"error\": \"Failed to record order: " + error + "\"}";
        }
        pgbc.close();
        
        /** Now process each item in the cart */
        // Parse items JSON and update sales
        // Format expected: [{"barcode":"xxx","price":"1.50","quantity":"2"},...]
        std::string items_copy = items_json;
        int success_count = 0;
        int error_count = 0;
        
        for ( size_t sz_start = items_copy.find("{"); sz_start != std::string::npos; sz_start = items_copy.find("{") ) {
            items_copy.erase(0, sz_start + 1);
            size_t sz_end = items_copy.find("}");
            if ( sz_end != std::string::npos ) {
                std::string item = items_copy.substr(0, sz_end);
                items_copy.erase(0, sz_end + 1);
                
                JSON<std::string,std::string> jItem(item);
                std::string barcode = jItem["barcode"];
                std::string price = jItem["price"];
                std::string quantity = jItem["quantity"];
                
                OmniIndex::Utils::Utils::trim(barcode);
                OmniIndex::Utils::Utils::trim(price);
                OmniIndex::Utils::Utils::trim(quantity);
                
                if ( barcode.length() > 0 && price.length() > 0 && quantity.length() > 0 ) {
                    if ( update_sale(barcode, price, quantity, "card", user, password, database) ) {
                        success_count++;
                    } else {
                        error_count++;
                    }
                }
            }
        }
        
        return "{\"response\": \"Order recorded successfully\", \"order_id\": \"" + order_id + "\", \"items_recorded\": " + std::to_string(success_count) + ", \"items_failed\": " + std::to_string(error_count) + ", \"subtotal\": " + std::to_string(subtotal) + ", \"vat_amount\": " + std::to_string(vat_amount) + ", \"total\": " + total_value + "}";
    } else {
        return "{\"error\": \"Database connection failed\"}";
    }
}

/** Get Customer Order History */
static inline
std::string get_order_history(std::string customer_email, const std::string user, const std::string password, 
                              const std::string database) {
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return "{\"error\": \"System configuration error!\"}";
    }
    
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database );
    if ( !pgbc._isConnected ) {
        return "{\"error\": \"Database connection failed\"}";
    }
    
    // Query orders for this customer
    std::string sql = "SELECT order_id, order_date, items, total_value, payment_method, order_status, subtotal, vat_amount FROM store.customer_orders WHERE email = '" + customer_email + "' ORDER BY order_date DESC;";
    std::string resp = pgbc.runCommand(sql);
    pgbc.close();
    
    if ( resp.empty() || resp.find("\"order_id\"") == std::string::npos ) {
        return "{\"orders\": []}";
    }
    
    // Parse response and build JSON array
    std::string orders_json = "{\"orders\": [";
    
    for ( size_t sz_start = resp.find("{"); sz_start != std::string::npos; sz_start = resp.find("{") ) {
        resp.erase(0, sz_start + 1);
        size_t sz_end = resp.find("}");
        if ( sz_end != std::string::npos ) {
            std::string order_record = resp.substr(0, sz_end);
            resp.erase(0, sz_end + 1);
            
            JSON<std::string,std::string> jOrder(order_record);
            std::string order_id = jOrder["order_id"];
            std::string order_date = jOrder["order_date"];
            std::string items = jOrder["items"];
            std::string total_value = jOrder["total_value"];
            std::string payment_method = jOrder["payment_method"];
            std::string order_status = jOrder["order_status"];
            std::string subtotal = jOrder["subtotal"];
            std::string vat_amount = jOrder["vat_amount"];
            
            OmniIndex::Utils::Utils::trim(order_id);
            OmniIndex::Utils::Utils::trim(order_date);
            OmniIndex::Utils::Utils::trim(items);
            OmniIndex::Utils::Utils::trim(total_value);
            OmniIndex::Utils::Utils::trim(payment_method);
            OmniIndex::Utils::Utils::trim(order_status);
            OmniIndex::Utils::Utils::trim(subtotal);
            OmniIndex::Utils::Utils::trim(vat_amount);
            
            if ( order_id.length() > 0 ) {
                // Escape quotes in items JSON for proper JSON formatting
                std::string escaped_items = items;
                OmniIndex::Utils::Utils::replace(escaped_items, "\"", "\\\"");
                
                orders_json += "{\"order_id\": \"" + order_id + "\", \"order_date\": \"" + order_date + "\", \"items\": \"" + escaped_items + "\", \"total_value\": " + total_value + ", \"subtotal\": " + (subtotal.length() > 0 ? subtotal : "0") + ", \"vat_amount\": " + (vat_amount.length() > 0 ? vat_amount : "0") + ", \"payment_method\": \"" + payment_method + "\", \"order_status\": \"" + order_status + "\"},";
            }
        }
    }
    
    // Remove trailing comma and close array
    if ( orders_json.back() == ',' ) {
        orders_json.pop_back();
    }
    orders_json += "]}";
    
    return orders_json;
}

/** Validate Cart Inventory */
static inline
std::string validate_cart_inventory(std::string items_json, const std::string user, const std::string password, 
                                    const std::string database) {
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return "{\"error\": \"System configuration error!\"}";
    }
    
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database );
    if ( !pgbc._isConnected ) {
        return "{\"error\": \"Database connection failed\"}";
    }
    
    std::string items_copy = items_json;
    std::string validation_json = "{\"valid\": true, \"items\": [";
    bool all_valid = true;
    
    for ( size_t sz_start = items_copy.find("{"); sz_start != std::string::npos; sz_start = items_copy.find("{") ) {
        items_copy.erase(0, sz_start + 1);
        size_t sz_end = items_copy.find("}");
        if ( sz_end != std::string::npos ) {
            std::string item = items_copy.substr(0, sz_end);
            items_copy.erase(0, sz_end + 1);
            
            JSON<std::string,std::string> jItem(item);
            std::string barcode = jItem["barcode"];
            std::string requested_qty = jItem["quantity"];
            
            OmniIndex::Utils::Utils::trim(barcode);
            OmniIndex::Utils::Utils::trim(requested_qty);
            
            if ( barcode.length() > 0 ) {
                // Check stock availability
                std::string sql = "SELECT quantity, product_description FROM store.stock AS s JOIN store.products AS p ON s.barcode = p.barcode WHERE s.barcode = '" + barcode + "';";
                std::string resp = pgbc.runCommand(sql);
                
                JSON<std::string,std::string> jStock(resp);
                std::string available_qty = jStock["quantity"];
                std::string description = jStock["product_description"];
                OmniIndex::Utils::Utils::trim(available_qty);
                OmniIndex::Utils::Utils::trim(description);
                
                long available = 0;
                long requested = std::stol(requested_qty);
                
                if ( available_qty.length() > 0 ) {
                    available = std::stol(available_qty);
                }
                
                bool item_valid = (available >= requested);
                if ( !item_valid ) {
                    all_valid = false;
                }
                
                validation_json += "{\"barcode\": \"" + barcode + "\", \"available\": " + std::to_string(available) + ", \"requested\": " + requested_qty + ", \"valid\": " + (item_valid ? "true" : "false") + ", \"description\": \"" + description + "\"},";
            }
        }
    }
    
    pgbc.close();
    
    if ( validation_json.back() == ',' ) {
        validation_json.pop_back();
    }
    validation_json += "], \"valid\": " + (all_valid ? std::string("true") : std::string("false")) + "}";
    
    return validation_json;
}

/** Sales Report - Detailed sales by date range */
static inline
std::string get_sales_report(std::string start_date, std::string end_date, const std::string user, 
                             const std::string password, const std::string database) {
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return "{\"error\": \"System configuration error!\"}";
    }
    
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database );
    if ( !pgbc._isConnected ) {
        return "{\"error\": \"Database connection failed\"}";
    }
    
    // Query: sales by date range
    std::string sql = "SELECT barcode, product_description, SUM(quantity) AS total_quantity, SUM(price * quantity) AS total_revenue FROM store.period_sales WHERE sale_date >= '" + start_date + "' AND sale_date <= '" + end_date + "' GROUP BY barcode, product_description ORDER BY total_revenue DESC;";
    std::string resp = pgbc.runCommand(sql);
    pgbc.close();
    
    if ( resp.empty() ) {
        return "{\"report_type\": \"sales\", \"period\": \"" + start_date + " to " + end_date + "\", \"total_revenue\": 0, \"items\": []}";
    }
    
    std::string sales_json = "{\"report_type\": \"sales\", \"period\": \"" + start_date + " to " + end_date + "\", \"items\": [";
    double total_revenue = 0;
    int total_items = 0;
    
    for ( size_t sz_start = resp.find("{"); sz_start != std::string::npos; sz_start = resp.find("{") ) {
        resp.erase(0, sz_start + 1);
        size_t sz_end = resp.find("}");
        if ( sz_end != std::string::npos ) {
            std::string item = resp.substr(0, sz_end);
            resp.erase(0, sz_end + 1);
            
            JSON<std::string,std::string> jItem(item);
            std::string barcode = jItem["barcode"];
            std::string description = jItem["product_description"];
            std::string quantity = jItem["total_quantity"];
            std::string revenue = jItem["total_revenue"];
            
            OmniIndex::Utils::Utils::trim(barcode);
            OmniIndex::Utils::Utils::trim(description);
            OmniIndex::Utils::Utils::trim(quantity);
            OmniIndex::Utils::Utils::trim(revenue);
            
            if ( barcode.length() > 0 ) {
                double qty = std::stod(quantity);
                double rev = std::stod(revenue);
                total_revenue += rev;
                total_items += (int)qty;
                
                sales_json += "{\"barcode\": \"" + barcode + "\", \"description\": \"" + description + "\", \"quantity\": " + quantity + ", \"revenue\": " + revenue + ", \"unit_price\": " + std::to_string(rev / qty) + "},";
            }
        }
    }
    
    if ( sales_json.back() == ',' ) {
        sales_json.pop_back();
    }
    sales_json += "], \"total_revenue\": " + std::to_string(total_revenue) + ", \"total_items_sold\": " + std::to_string(total_items) + "}";
    
    return sales_json;
}

/** Revenue Report - Accounting-focused revenue analysis */
static inline
std::string get_revenue_report(std::string start_date, std::string end_date, const std::string user, 
                               const std::string password, const std::string database) {
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return "{\"error\": \"System configuration error!\"}";
    }
    
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database );
    if ( !pgbc._isConnected ) {
        return "{\"error\": \"Database connection failed\"}";
    }
    
    // Calculate revenue metrics
    std::string sql = "SELECT COUNT(DISTINCT email) AS customer_count, COUNT(*) AS transaction_count, SUM(total_value) AS gross_revenue, AVG(total_value) AS avg_transaction FROM store.customer_orders WHERE order_date >= '" + start_date + "' AND order_date <= '" + end_date + "';";
    std::string resp = pgbc.runCommand(sql);
    
    JSON<std::string,std::string> jMetrics(resp);
    std::string customer_count = jMetrics["customer_count"];
    std::string transaction_count = jMetrics["transaction_count"];
    std::string gross_revenue = jMetrics["gross_revenue"];
    std::string avg_transaction = jMetrics["avg_transaction"];
    
    OmniIndex::Utils::Utils::trim(customer_count);
    OmniIndex::Utils::Utils::trim(transaction_count);
    OmniIndex::Utils::Utils::trim(gross_revenue);
    OmniIndex::Utils::Utils::trim(avg_transaction);
    
    pgbc.close();
    
    // Assuming 15% COGS for accounting purposes (this can be configured)
    double revenue = gross_revenue.length() > 0 ? std::stod(gross_revenue) : 0;
    double cogs = revenue * 0.15;  // Cost of Goods Sold
    double gross_profit = revenue - cogs;
    double profit_margin = revenue > 0 ? (gross_profit / revenue * 100) : 0;
    
    std::string revenue_json = "{\"report_type\": \"revenue\", \"period\": \"" + start_date + " to " + end_date + "\", ";
    revenue_json += "\"gross_revenue\": " + std::to_string(revenue) + ", ";
    revenue_json += "\"cost_of_goods_sold\": " + std::to_string(cogs) + ", ";
    revenue_json += "\"gross_profit\": " + std::to_string(gross_profit) + ", ";
    revenue_json += "\"profit_margin_percent\": " + std::to_string(profit_margin) + ", ";
    revenue_json += "\"transactions\": " + transaction_count + ", ";
    revenue_json += "\"customers\": " + customer_count + ", ";
    revenue_json += "\"avg_transaction_value\": " + avg_transaction + "}";
    
    return revenue_json;
}

/** Inventory Report - Current stock valuation and metrics */
static inline
std::string get_inventory_report(const std::string user, const std::string password, const std::string database) {
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return "{\"error\": \"System configuration error!\"}";
    }
    
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database );
    if ( !pgbc._isConnected ) {
        return "{\"error\": \"Database connection failed\"}";
    }
    
    // Get current inventory with valuation
    std::string sql = "SELECT p.barcode, p.product_description, s.quantity, p.rs_price, (s.quantity * p.rs_price) AS inventory_value, p.supplier FROM store.stock AS s JOIN store.products AS p ON s.barcode = p.barcode ORDER BY inventory_value DESC;";
    std::string resp = pgbc.runCommand(sql);
    pgbc.close();
    
    if ( resp.empty() ) {
        return "{\"report_type\": \"inventory\", \"items\": [], \"total_inventory_value\": 0}";
    }
    
    std::string inventory_json = "{\"report_type\": \"inventory\", \"items\": [";
    double total_value = 0;
    int total_items = 0;
    
    for ( size_t sz_start = resp.find("{"); sz_start != std::string::npos; sz_start = resp.find("{") ) {
        resp.erase(0, sz_start + 1);
        size_t sz_end = resp.find("}");
        if ( sz_end != std::string::npos ) {
            std::string item = resp.substr(0, sz_end);
            resp.erase(0, sz_end + 1);
            
            JSON<std::string,std::string> jItem(item);
            std::string barcode = jItem["barcode"];
            std::string description = jItem["product_description"];
            std::string quantity = jItem["quantity"];
            std::string price = jItem["price"];
            std::string inv_value = jItem["inventory_value"];
            std::string supplier = jItem["supplier_encrypt"];
            
            OmniIndex::Utils::Utils::trim(barcode);
            OmniIndex::Utils::Utils::trim(description);
            OmniIndex::Utils::Utils::trim(quantity);
            OmniIndex::Utils::Utils::trim(price);
            OmniIndex::Utils::Utils::trim(inv_value);
            OmniIndex::Utils::Utils::trim(supplier);
            
            if ( barcode.length() > 0 && quantity.length() > 0 ) {
                int qty = std::stoi(quantity);
                double val = inv_value.length() > 0 ? std::stod(inv_value) : 0;
                total_value += val;
                total_items += qty;
                
                inventory_json += "{\"barcode\": \"" + barcode + "\", \"description\": \"" + description + "\", \"quantity\": " + quantity + ", \"unit_price\": " + price + ", \"total_value\": " + inv_value + ", \"supplier\": \"" + supplier + "\"},";
            }
        }
    }
    
    if ( inventory_json.back() == ',' ) {
        inventory_json.pop_back();
    }
    inventory_json += "], \"total_inventory_value\": " + std::to_string(total_value) + ", \"total_items\": " + std::to_string(total_items) + "}";
    
    return inventory_json;
}

/** Tax Summary - Sales tax data for accounting */
static inline
std::string get_tax_summary(std::string start_date, std::string end_date, const std::string user, 
                            const std::string password, const std::string database) {
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return "{\"error\": \"System configuration error!\"}";
    }
    
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database );
    if ( !pgbc._isConnected ) {
        return "{\"error\": \"Database connection failed\"}";
    }
    
    // Get total sales for tax period
    std::string sql = "SELECT COUNT(*) AS order_count, SUM(total_value) AS total_sales FROM store.customer_orders WHERE order_date >= '" + start_date + "' AND order_date <= '" + end_date + "';";
    std::string resp = pgbc.runCommand(sql);
    pgbc.close();
    
    JSON<std::string,std::string> jData(resp);
    std::string order_count = jData["order_count"];
    std::string total_sales = jData["total_sales"];
    
    OmniIndex::Utils::Utils::trim(order_count);
    OmniIndex::Utils::Utils::trim(total_sales);
    
    double sales = total_sales.length() > 0 ? std::stod(total_sales) : 0;
    double vat_20pct = sales * 0.20;  // 20% VAT (UK standard rate)
    double vat_5pct = sales * 0.05;   // 5% VAT (reduced rate)
    
    std::string tax_json = "{\"report_type\": \"tax_summary\", \"period\": \"" + start_date + " to " + end_date + "\", ";
    tax_json += "\"orders\": " + order_count + ", ";
    tax_json += "\"total_sales\": " + std::to_string(sales) + ", ";
    tax_json += "\"vat_20pct\": " + std::to_string(vat_20pct) + ", ";
    tax_json += "\"vat_5pct\": " + std::to_string(vat_5pct) + ", ";
    tax_json += "\"total_vat_estimate\": " + std::to_string(vat_20pct) + "}";
    
    return tax_json;
}

/** Receipt Generator - Retrieve and format order as receipt */
static inline
std::string get_receipt(std::string order_id, const std::string user, const std::string password, 
                        const std::string database) {
    std::map<std::string, std::string> m_conf = get_configuration();
    if ( m_conf.empty() ) {
        return "{\"error\": \"System configuration error!\"}";
    }
    
    order_id = OmniIndex::Utils::Utils::replace(order_id, "%", "");  // Decode URL encoding
    
    Postgresql pgbc = Postgresql( user, password, m_conf["server"], m_conf["port"], database );
    if ( !pgbc._isConnected ) {
        return "{\"error\": \"Database connection failed\"}";
    }
    
    // Get order details
    std::string sql = "SELECT order_id, email, items, total_value, payment_method, order_status, order_date, subtotal, vat_amount, vat_rate FROM store.customer_orders WHERE order_id = '" + order_id + "' LIMIT 1;";
    std::string resp = pgbc.runCommand(sql);
    
    if ( resp.empty() ) {
        pgbc.close();
        return "{\"error\": \"Order not found\"}";
    }
    
    JSON<std::string,std::string> jOrder(resp);
    std::string order_email = jOrder["email"];
    std::string items_json = jOrder["items"];
    std::string total_value = jOrder["total_value"];
    std::string payment_method = jOrder["payment_method"];
    std::string order_status = jOrder["order_status"];
    std::string order_date = jOrder["order_date"];
    std::string stored_subtotal = jOrder["subtotal"];
    std::string stored_vat_amount = jOrder["vat_amount"];
    std::string stored_vat_rate = jOrder["vat_rate"];
    
    OmniIndex::Utils::Utils::trim(order_email);
    OmniIndex::Utils::Utils::trim(items_json);
    OmniIndex::Utils::Utils::trim(total_value);
    OmniIndex::Utils::Utils::trim(payment_method);
    OmniIndex::Utils::Utils::trim(order_status);
    OmniIndex::Utils::Utils::trim(order_date);
    OmniIndex::Utils::Utils::trim(stored_subtotal);
    OmniIndex::Utils::Utils::trim(stored_vat_amount);
    OmniIndex::Utils::Utils::trim(stored_vat_rate);
    
    // Parse items to get product details
    std::string receipt_json = "{\"receipt\": {";
    receipt_json += "\"order_id\": \"" + order_id + "\", ";
    receipt_json += "\"customer_email\": \"" + order_email + "\", ";
    receipt_json += "\"order_date\": \"" + order_date + "\", ";
    receipt_json += "\"payment_method\": \"" + payment_method + "\", ";
    receipt_json += "\"order_status\": \"" + order_status + "\", ";
    receipt_json += "\"items\": [";
    
    // Parse items array from JSON string
    double subtotal = 0;
    int item_count = 0;
    
    for ( size_t sz_start = items_json.find("{"); sz_start != std::string::npos; sz_start = items_json.find("{") ) {
        items_json.erase(0, sz_start + 1);
        size_t sz_end = items_json.find("}");
        if ( sz_end != std::string::npos ) {
            std::string item = items_json.substr(0, sz_end);
            items_json.erase(0, sz_end + 1);
            
            JSON<std::string,std::string> jItem(item);
            std::string barcode = jItem["barcode"];
            std::string quantity = jItem["quantity"];
            std::string price = jItem["price"];
            
            OmniIndex::Utils::Utils::trim(barcode);
            OmniIndex::Utils::Utils::trim(quantity);
            OmniIndex::Utils::Utils::trim(price);
            
            if ( barcode.length() > 0 ) {
                // Get product description
                std::string prod_sql = "SELECT product_description FROM store.products WHERE barcode = '" + barcode + "' LIMIT 1;";
                std::string prod_resp = pgbc.runCommand(prod_sql);
                
                JSON<std::string,std::string> jProd(prod_resp);
                std::string description = jProd["product_description"];
                OmniIndex::Utils::Utils::trim(description);
                
                double qty = std::stod(quantity);
                double prc = std::stod(price);
                double line_total = qty * prc;
                subtotal += line_total;
                
                receipt_json += "{\"barcode\": \"" + barcode + "\", \"description\": \"" + description + "\", \"quantity\": " + quantity + ", \"unit_price\": " + price + ", \"line_total\": " + std::to_string(line_total) + "},";
                item_count++;
            }
        }
    }
    
    if ( receipt_json.back() == ',' ) {
        receipt_json.pop_back();
    }
    
    double total = std::stod(total_value);
    double vat_amount = stored_vat_amount.length() > 0 ? std::stod(stored_vat_amount) : 0;
    double vat_rate = stored_vat_rate.length() > 0 ? std::stod(stored_vat_rate) : 0.20;
    double subtotal_val = stored_subtotal.length() > 0 ? std::stod(stored_subtotal) : (total - vat_amount);
    
    // If VAT wasn't stored, calculate it
    if ( vat_amount == 0 && subtotal_val == 0 ) {
        vat_amount = total * vat_rate / (1 + vat_rate);
        subtotal_val = total - vat_amount;
    }
    
    receipt_json += "], ";
    receipt_json += "\"subtotal\": " + std::to_string(subtotal_val) + ", ";
    receipt_json += "\"vat_amount\": " + std::to_string(vat_amount) + ", ";
    receipt_json += "\"vat_rate_percent\": " + std::to_string(vat_rate * 100) + ", ";
    receipt_json += "\"total\": " + std::to_string(total) + ", ";
    receipt_json += "\"item_count\": " + std::to_string(item_count) + "}}";
    
    pgbc.close();
    
    return receipt_json;
}

int main (int argc, char** argv) {
    /* Set the return headers in place */
    std::cout << "Access-Control-Allow-Origin: *\r\n";
    std::cout << "Access-Control-Allow-Headers: *\r\n";
    std::cout << "Access-Control-Allow-Credentials: true\r\n";
    std::cout << "Access-Control-Allow-Methods: *\r\n";
    std::cout << "Content-Type: application/json\r\n\r\n";
    std::map<std::string, std::string> m_configuration = get_configuration();
    std::string queryString;
    bool is_white_listed = false;
    #ifdef DEBUG 
        /** Addproduct(const std::string supplier, const std::string barcode, const std::string rs_price, const std::string description ...) */
        //queryString="username=sibain@omniindex.io&command=addproduct&password=Ch35t3r&supplier=James C. Brett&barcode=&createbarcode=true&rs_price=120.2&description=Wendy - With Wool Aran 400g";
        /** update_stock(const std::string supplier, const std::string barcode, const std::string quantity, */
        //command=updatestock&username=sibain%40omniindex.io&password=Ch35t3r&barcode=5055559629849&quantity=4
        queryString="username=sibain@omniindex.io&command=updatestock&password=Ch35t3r&barcode=5055559629849&quantity=4";
        /** setfloat  */
        //queryString="username=sibain@omniindex.io&command=setfloat&password=Ch35t3r&float=45.00";
        /** addsupplier add_supplier(const std::string supplier, const std::string telephone, const std::string address, const std::string postcode */
        //queryString="username=sibain@omniindex.io&command=addsupplier&password=Ch35t3r&supplier=James C Brett Ltd&telephone=01274 565959&address=James C Brett Ltd Monarch Mill Clyde Street Bingley West Yorkshire BD16 2NT&postcode=BD16 2NT&supplier_email=sales@jamescbrett.co.uk";
        /** getsupplierlist(const std::string barcde */
        //queryString="username=sibain@omniindex.io&command=getsupplierlist&password=Ch35t3r";          
        /** rs_pricelookup(const std::string barcde */
        //queryString="username=sibain@omniindex.io&command=rs_pricelookup&password=Ch35t3r&barcode=3026980310127";
        /** getdetails(const std::string barcde */
        //queryString="username=sibain@omniindex.io&command=getdetails&password=Ch35t3r&barcode=gonk";   
        //queryString="username=sibain@omniindex.io&command=getadvice&password=Ch35t3r&prompt=can an elephant eat a sheep";     
        /** quantitylookup(const std::string barcde */
        //queryString="username=sibain@omniindex.io&command=quantitylookup&password=Ch35t3r&barcode=098767890"; 
        /** update_sale(barcode, rs_price, quantity, type, */ 
        //queryString="username=sibain@omniindex.io&command=sellitem&password=Ch35t3r&barcode=5055559640479&price=8.50&quantity=&type=cash";   
        /** cash_up(const std::string user, const std::string password, const std::string database)  */ 
        //queryString="username=sibain@omniindex.io&command=cashup&password=Ch35t3r";    
        /** get_dashboard */
        //queryString="username=sibain@omniindex.io&command=getdashboard&password=Ch35t3r";
        /** stock_take(barcode, user, password, database) */
        //queryString="username=sibain@omniindex.io&command=stocktake&password=Ch35t3r&barcode=973098767891";
        /** complete_stock_take(user, password, database) */
        //queryString="username=sibain@omniindex.io&command=completestocktake&password=Ch35t3r&barcode=973098767891";  
        /** add_invoicestd::string invoice_number, std::string supplier, std::string details, std::string amount, bool paid, ... */
//       queryString="username=sibain@omniindex.io&command=addinvoice&password=Ch35t3r&suppleier=James C Brett Ltd&details=KP 1 Patterns 177 1.40 245.70 1";
// queryString+="U Aurora Dk 100g 5 16.60 83.00 1";
// queryString+="IBD Baby DK 100g 3 10.50 31.50 1";
// queryString+="BL Baby Twinkle 100g 1 15.40 15.40 1";
// queryString+="BTP Baby Twinkle Prints DK 100g 4 19.40 77.60 1";
// queryString+="DCB Craft Cotton Bleached 100g 1 7.50 7.50 1";
// queryString+="DC Craft Cotton Ecru 100g 1 7.50 7.50 1";
// queryString+="H Faux Fur Chunky 100g 4 12.80 51.20 1";
// queryString+="UG Huggable Super Chunky 250g 6 16.65 99.90 1";
// queryString+="IC It's Pure Cotton 6 14.60 87.60 1";
// queryString+="MC Marble Chunky 200g 6 15.65 93.90 1";
// queryString+="MK Munchkin Super Chunky 200g 7 16.65 116.55 1";
// queryString+="SW Stonewash DK 100g 4 16.00 64.00 1";
// queryString+="TSC Top Value Super Chunky 100g 4 10.00 40.00 1";
// queryString+="TK Twinkle DK 100g 5 15.00 75.00 1&amount=1315.52&paid=false&invoice_number=0168979"; 

//add_user(const std::string user, const std::string new_user, const std::string  new_password, const std::string  address, const std::string zip_code,
    //const std::string  telephone, const std::string  first_name, const std::string last_name, const std::string  password, const std::string  database) 
   // queryString="username=sibain@omniindex.io&command=adduser&password=Ch35t3r&newuser=sibain@tendotzero.com&newpassword=123456789&address=11 church str, eyemouth berwickshire&zipcode=TD14 5DH&firstname=Simon&lastname=Bain&telephone=9172920751"; 
   // queryString="&command=getadvice&prompt=how do I knit";   
    #else
        Environment <std::string, std::string> environment;
        Environment<std::string, std::string>::iterator itr;
        
        // Check REQUEST_METHOD to determine if GET or POST
        Environment<std::string, std::string>::iterator method_itr = environment.find("REQUEST_METHOD");
        std::string request_method = (method_itr != environment.end()) ? method_itr->second : "GET";
        
        if ( request_method == "POST" ) {
            // Read POST body from stdin
            Environment<std::string, std::string>::iterator content_length_itr = environment.find("CONTENT_LENGTH");
            if ( content_length_itr != environment.end() ) {
                int content_length = std::stoi(content_length_itr->second);
                char buffer[4096];
                std::cin.read(buffer, std::min(content_length, 4095));
                queryString = std::string(buffer, std::cin.gcount());
            } else {
                std::cout << "Content-type:application/json\r\n\r\n";
                std::cout << "{\"error\": \"No content length for POST request\"}\n\n";
                return 0;
            }
        } else {
            // GET request - use QUERY_STRING
            itr = environment.find("QUERY_STRING");
            if ( itr != environment.end() ) { queryString = itr->second; }
            else {
                std::cout << "Content-type:application/json\r\n\r\n";
                std::cout << "{\"error\": \"No details have been passed\"}\n\n";
                return 0;
            }
        }

        /** Get teh server name */

        itr = environment.find("SERVER_NAME");
        std::string server_name;
        if ( itr != environment.end() ) { server_name = itr->second.c_str(); }
        std::string white_list = m_configuration["server_whitelist"];
        if ( white_list.length() > 4 ) {/** 2 spaces, newline '  \n' */
            if ( white_list.find(server_name) == std::string::npos) {
                /** Return quietly */
                // std::cout << "\n\n";
                // return 0;
                is_white_listed = true;
            } else {
                is_white_listed = true;
            }
        }
is_white_listed = true;

    #endif
    QueryData <std::string, std::string> queryData(queryString);

    QueryData<std::string, std::string>::iterator it = queryData.find("username");
    std::string username, command, password, database, email_address;
    if ( it != queryData.end() ) {
        email_address = it->second;
        email_address = url_decode(email_address);       
    } else {
        if ( is_white_listed ) {
            email_address = m_configuration["epos_user"];
        } else {
            /** return error  */
            std::cout << "{\"error\": \"username and or password not found\"}\n\n";
            return 0;
        }
    }
    it = queryData.find("password");
    if ( it != queryData.end() ) {
        password = it->second;
        password = url_decode(password);       
    } else {
        if ( is_white_listed ) {
            password = m_configuration["epos_password"];
        } else {
            /** return error  */
            std::cout << "{\"error\": \"username and or password not found\"}\n\n";
            return 0;
        }
    } 
    it = queryData.find("command");
    if ( it != queryData.end() ) {
        command = it->second;
        command = url_decode(command);       
    } else {
        /** return error  */
        std::cout << "{\"error\": \"I have nothing to do. Please supply a command parameter within your call!\"}\n\n";
        return 0;
    }
    
    OmniIndex::Utils::Utils::toLower(command);
    
    // Login command doesn't need old user credentials check
    if ( command == "login" ) {
        std::string username, login_password;
        std::map<std::string, std::string> m_conf = get_configuration();
        
        it = queryData.find("username");
        if ( it != queryData.end() ) {
            username = it->second;
            username = url_decode(username);
        } else {
            std::cout << "{\"error\": \"username is required\"}\n\n";
            std::cout.flush();
            return 0;
        }
        
        it = queryData.find("password");
        if ( it != queryData.end() ) {
            login_password = it->second;
            login_password = url_decode(login_password);
        } else {
            std::cout << "{\"error\": \"password is required\"}\n\n";
            std::cout.flush();
            return 0;
        }
        
        try {
            // Create shared database connection for authentication using store credentials
            std::string db_user = m_conf["username"];        // store
            std::string db_password = m_conf["password"];    // from config
            std::string db_server = m_conf["server"];
            std::string db_port = m_conf["port"];
            std::string db_name = "postgres";                // authentication database
            
            std::cerr << "[LOGIN] Config loaded: user=" << db_user << " password=" << db_password << " server=" << db_server << " port=" << db_port << " database=" << db_name << std::endl;
            std::cerr << "[LOGIN] Connection string: postgresql://" << db_user << ":***@" << db_server << ":" << db_port << "/" << db_name << std::endl;
            std::cerr.flush();
            
            std::cerr << "[LOGIN] Creating Postgresql connection..." << std::endl;
            std::cerr.flush();
            
            auto pgbc = std::make_shared<Postgresql>(db_user, db_password, db_server, db_port, db_name);
            
            std::cerr << "[LOGIN] Postgresql connection created" << std::endl;
            std::cerr << "[LOGIN] Connection status: " << (pgbc ? "not null" : "NULL") << std::endl;
            std::cerr.flush();
            std::cerr.flush();
            
            std::cerr << "[LOGIN] Creating Authentication object..." << std::endl;
            std::cerr.flush();
            
            Authentication auth(pgbc, db_name);
            
            std::cerr << "[LOGIN] Authentication object created, calling authenticate()..." << std::endl;
            std::cerr.flush();
            
            std::map<std::string, std::string> auth_result = auth.authenticate(username, login_password);
            
            std::cerr << "[LOGIN] authenticate() returned" << std::endl;
            
            if (!auth_result.empty() && auth_result["authenticated"] == "true") {
                std::cout << "{"
                         << "\"success\": true, "
                         << "\"user_id\": " << auth_result["id"] << ", "
                         << "\"username\": \"" << auth_result["username"] << "\", "
                         << "\"email\": \"" << auth_result["email"] << "\", "
                         << "\"role\": \"" << auth_result["role"] << "\", "
                         << "\"full_name\": \"" << auth_result["full_name"] << "\""
                         << "}\n\n";
                std::cout.flush();
            } else {
                std::cout << "{\"error\": \"Invalid username or password\"}\n\n";
                std::cout.flush();
            }
        } catch (const std::exception& e) {
            std::cout << "{\"error\": \"Authentication error: " << e.what() << "\"}\n\n";
            std::cout.flush();
        }
        return 0;
    }
    
    // All other commands require user credentials validation
    std::string user = check_user_credentials(email_address, password);
    JSON<std::string,std::string> jResp(user);
    JSON<std::string,std::string> jUser(jResp["response"]);    
    // Reject if user is NOT active
    if ( jUser["is_active"] != "t" && jUser["is_active"] != "true" && jUser["is_active"] != "1" ) {
        std::cout << "{\"error\": \"User is not active on the system. Please check your username and password.\"}\n\n";
        return 0;
    }
    // All users connect to postgres database
    database = "postgres";
    
    /** We will now go through the commands */
    if ( command == "addproduct" ) {
        std::string create_barcode;
        it = queryData.find("createbarcode");
        if ( it != queryData.end() ) {
            create_barcode = it->second;
            create_barcode = url_decode(create_barcode);
            OmniIndex::Utils::Utils::trim(create_barcode);
        }  else {
            create_barcode = "true";
        }      
        std::string barcode;
        it = queryData.find("barcode");
        if ( it != queryData.end() ) {
            barcode = it->second;
            barcode = url_decode(barcode);
            OmniIndex::Utils::Utils::trim(barcode);
            if ( barcode == "" && create_barcode == "true"  ) {
 //           for ( int i = 0; i < 9; ++i ) {
            barcode = OmniIndex::Utils::Utils::create_ean_code();
            // std:: cout << barcode << "\n";
            // }
            }
        } else if ( create_barcode == "true" ) {
//            for ( int i = 0; i < 30; ++i ) {
            barcode = OmniIndex::Utils::Utils::create_ean_code();
//            std:: cout << barcode << "\n";
//            }
        }
        it = queryData.find("description");
        std::string description;
        if ( it != queryData.end() ) {
            description = it->second;
            description = url_decode(description);
        }
        it = queryData.find("price");
        std::string rs_price;
        if ( it != queryData.end() ) {
            rs_price = it->second;
            rs_price = url_decode(rs_price);
        }
        it = queryData.find("supplier");
        std::string supplier;
        if ( it != queryData.end() ) {
            supplier = it->second;
            supplier = url_decode(supplier);
        }
        if ( barcode == "" || description == "" || rs_price == "" || supplier == "" ) {
            std::cout << "{\"error\": \"Please provide all of the required fields.\"}\n\n";
            return 0;            
        }
        if ( add_product(supplier, barcode, rs_price, description, jUser["username"], password, database) ) {
            std::cout << "{\"response\": \"" + barcode + ", has been added to the system.\"}\n\n";
            return 0;  
        } else {
            std::cout << "{\"error\": \"" + barcode + ", failed to be added to the system.\"}\n\n";
            return 0;              
        }
    }
    else if ( command == "updatestock" ) {
        std::string barcode;
        it = queryData.find("barcode");
        if ( it != queryData.end() ) {
            barcode = it->second;
            barcode = url_decode(barcode);
        }
        it = queryData.find("quantity");
        std::string quantity;
        if ( it != queryData.end() ) {
            quantity = it->second;
            quantity = url_decode(quantity);
        }
        it = queryData.find("rs_price");
        std::string rs_price;
        if ( it != queryData.end() ) {
            rs_price = it->second;
            rs_price = url_decode(rs_price);
        }
        if ( barcode == "" || quantity == "" ) {
            std::cout << "{\"error\": \"Please provide all of the required fields.\"}\n\n";
            return 0;            
        }
        if ( update_stock(barcode, quantity, jUser["username"], password, database) ) {
            std::cout << "{\"response\": \"" + barcode + ", has been updated on the system.\"}\n\n";
            return 0;  
        } else {
            std::cout << "{\"error\": \"" + barcode + ", failed to be updated on the system.\"}\n\n";
            return 0;              
        }
    }
    else if ( command == "addsupplier" ) {
        it = queryData.find("supplier");
        std::string supplier;
        if ( it != queryData.end() ) {
            supplier = it->second;
            supplier = url_decode(supplier);
        }        
        it = queryData.find("telephone");
        std::string telephone;
        if ( it != queryData.end() ) {
            telephone = it->second;
            telephone = url_decode(telephone);
        }
        it = queryData.find("address");
        std::string address;
        if ( it != queryData.end() ) {
            address = it->second;
            address = url_decode(address);
        } 
        it = queryData.find("postcode");
        std::string postcode;
        if ( it != queryData.end() ) {
            postcode = it->second;
            postcode = url_decode(postcode);
        } 
        it = queryData.find("supplier_email");
        std::string supplier_email;
        if ( it != queryData.end() ) {
            supplier_email = it->second;
            supplier_email = url_decode(supplier_email);
        }                          

        if ( supplier == "" || telephone == "" || address == "" || postcode == "" ) {
            std::cout << "{\"error\": \"Please provide all of the required fields.\"}\n\n";
            return 0;            
        }
        if ( add_supplier(supplier, telephone, address, postcode, supplier_email, jUser["username"], password, database) ) {
            std::cout << "{\"response\": \"" + supplier + ", has been added to the system.\"}\n\n";
            return 0;  
        } else {
            std::cout << "{\"error\": \"" + supplier + ", failed to be added to the system.\"}\n\n";
            return 0;              
        }        
    }
    else if ( command == "getsupplierlist" ) {
        std::string response = get_supplier_list(jUser["username"], password, database);
        std::cout << response << "\n\n";
        return 0;           
    }
    else if ( command == "getworkshops" ) {
        std::string response = get_workshops(jUser["username"], password, database);
        std::cout << response << "\n\n";
        return 0;           
    }
    else if ( command == "setfloat" ) {
        it = queryData.find("float");
        std::string float_value;
        if ( it != queryData.end() ) {
            float_value = it->second;
            float_value = url_decode(float_value);
        }
        if ( set_float(float_value, jUser["username"], password, database) ) {
            std::cout << "{\"response\": \"You float has been added.\"}\n\n";
            return 0;  
        }
        std::cout << "{\"error\": \"Float could not be added. Please retry.\"}\n\n";
        return 0;        
    }
    else if ( command == "pricelookup" ) {
         std::string barcode;
        it = queryData.find("barcode");
        if ( it != queryData.end() ) {
            barcode = it->second;
            barcode = url_decode(barcode);
        }  
        if ( barcode == "" ) {
            std::cout << "{\"error\": \"Please provide all of the required fields.}\n\n";
            return 0;            
        }
        std::string response = get_price(barcode, jUser["username"], password, database);
        std::cout << response << "\n\n";
        return 0;               
    }
    else if ( command == "getdetails" ) {
        std::string barcode;
        it = queryData.find("barcode");
        if ( it != queryData.end() ) {
            barcode = it->second;
            barcode = url_decode(barcode);
        }  
        if ( barcode == "" ) {
            std::cout << "{\"error\": \"Please provide all of the required fields.}\n\n";
            return 0;            
        }
        std::string response = get_details(barcode, jUser["username"], password, database);
        std::cout << response << "\n\n";
        return 0;               
    }    
    else if ( command == "quantitylookup" ) {
         std::string barcode;
        it = queryData.find("barcode");
        if ( it != queryData.end() ) {
            barcode = it->second;
            barcode = url_decode(barcode);
        }  
        if ( barcode == "" ) {
            std::cout << "{\"error\": \"Please provide all of the required fields.}\n\n";
            return 0;            
        }
        std::string response = get_stock_count(barcode, jUser["username"], password, database);
        std::cout << response << "\n\n";
        return 0;               
    }    
    else if ( command == "sellitem" ) {
        std::string barcode;
        it = queryData.find("barcode");
        if ( it != queryData.end() ) {
            barcode = it->second;
            barcode = url_decode(barcode);
        }  
        if ( barcode == "" ) {
            barcode = "cash sale";
            // std::cout << "{\"error\": \"Please provide all of the required fields.}\n\n";
            // return 0;            
        }
        std::string rs_price;
        it = queryData.find("price");
        if ( it != queryData.end() ) {
            rs_price = it->second;
            rs_price = url_decode(rs_price);
        } 
        if ( rs_price == "" ) {
            std::cout << "{\"error\": \"Please provide all of the required fields.}\n\n";
            return 0;            
        }
        std::string quantity;
        it = queryData.find("quantity");
        if ( it != queryData.end() ) {
            quantity = it->second;
            quantity = url_decode(quantity);
        }
        std::string type;
        it = queryData.find("type");
        if ( it != queryData.end() ) {
            type = it->second;
            type = url_decode(type);
        }          
        if ( type == "" ) {
            type = "undisclosed";          
        }
        if ( update_sale(barcode, rs_price, quantity, type, jUser["username"], password,  database) ) {
            std::cout << "{\"response\": \"Sale complete.}\n\n";
            return 0;  
        }                        
        std::cout << "{\"error\": \"Sales system failed to update. Please keep details amd manually add at the end of teh day.}\n\n";
        return 0;            
    }
    else if ( command == "cashup" ) {
        std::string response = cash_up(jUser["username"], password,  database);
        std::cout << response << "\n\n";
        return 0;  
    }
    else if ( command == "getdashboard" ) {
        std::string response = get_dashboard(jUser["username"], password, database);
        std::cout << response << "\n\n";
        return 0;      
    }
    else if ( command == "stocktake" ) {
        std::string barcode;
        it = queryData.find("barcode");
        if ( it != queryData.end() ) {
            barcode = it->second;
            barcode = url_decode(barcode);
        }        
        std::string stock = stock_take(barcode, jUser["username"], password, database);
        if ( stock == "" ) {
            std::cout << "{\"shelf\": \"not counted\", \"stock\": \"not counted\"}\n\n";
        } else {
            std::cout << stock << "\n\n";
        }
        return 0;
    }
    else if ( command == "completestocktake" ) {      
        if ( complete_stock_take(jUser["username"], password, database) ) {
            
        } else {
            std::cout << "{\"error\": \"Update failed\"}\n\n";
        }
        return 0;
    }    
    else if ( command == "addinvoice" ) {
        //queryString="username=sibain@omniindex.io&command=addinvoice&password=Ch35t3r&suppleier=James C Brett Ltd&details=&amount=&paid=false&invoicenumber=0168979";  

        it = queryData.find("supplier");
        std::string supplier;
        if ( it != queryData.end() ) {
            supplier = it->second;
            supplier = url_decode(supplier);
        }
        it = queryData.find("details");
        std::string details;
        if ( it != queryData.end() ) {
            details = it->second;
            details = url_decode(details);
        }
        it = queryData.find("amount");    
        std::string amount;
        if ( it != queryData.end() ) {
            amount = it->second;
            amount = url_decode(amount);
        } 
        it = queryData.find("invoicenumber");
        std::string invoicenumber;
        if ( it != queryData.end() ) {
            invoicenumber = it->second;
            invoicenumber = url_decode(invoicenumber);
        }  
        it = queryData.find("paid");
        std::string paid;
        if ( it != queryData.end() ) {
            paid = it->second;
            paid = url_decode(paid);
        } 
        bool is_paid;
        if ( paid == "true" ) {
            is_paid = true;
        } else {
            is_paid = false;
        } 
        if ( add_invoice(invoicenumber, supplier, details, amount, is_paid, jUser["username"], password, database) ) {
            std::cout << "{\"response\": \"" + invoicenumber + ", has been updated on the system.\"}\n\n";
            return 0;  
        } else {
            std::cout << "{\"error\": \"" + invoicenumber + ", failed to be updated on the system.\"}\n\n";
            return 0;              
        }                                    
    }
    else if (command == "adduser" ) {
        std::string new_user, new_password, address, telephone, zip_code, first_name, last_name;
        it = queryData.find("newuser");
        if ( it != queryData.end() ) {
            new_user = it->second;
            new_user = url_decode(new_user);
        }
        it = queryData.find("newpassword");
        if ( it != queryData.end() ) {
            new_password = it->second;
            new_password = url_decode(new_password);
        } 
        it = queryData.find("address");
        if ( it != queryData.end() ) {
            address = it->second;
            address = url_decode(address);
        } 
        it = queryData.find("telephone");
        if ( it != queryData.end() ) {
            telephone = it->second;
            telephone = url_decode(telephone);
        }  
        it = queryData.find("zipcode");
        if ( it != queryData.end() ) {
            zip_code = it->second;
            zip_code = url_decode(zip_code);
        } 
        it = queryData.find("firstname");
        if ( it != queryData.end() ) {
            first_name = it->second;
            first_name = url_decode(first_name);
        } 
        it = queryData.find("lastname");
        if ( it != queryData.end() ) {
            last_name = it->second;
            last_name = url_decode(last_name);
        }                                                           
        if ( add_user(jUser["username"],new_user, new_password, address, zip_code, telephone, first_name, last_name, password, database) ) {
            std::cout << "{\"response\": \"" + new_user + ", has been updated on the system.\"}\n\n";
            return 0;  
        } else {
            std::cout << "{\"error\": \"" + new_user + ", failed to be updated on the system.\"}\n\n";
            return 0;  
        }
    }
    else if ( command == "getadvice" ) {
        it = queryData.find("prompt");
        std::string prompt;
        if ( it != queryData.end() ) {
            prompt = it->second;
            prompt = url_decode(prompt);
        } else {
            std::cout << "{\"error\": \"Please provide a prompt for the advice.\"}\n\n";
            return 0;  
        }
        std::string response = get_advice(prompt);
        std::cout << "{\"response\": \"" + response + "\"}\n\n";
        return 0;  
    }
    else if ( command == "webstoreorder" ) {
        std::string order_id, items_json, total_value, payment_method;
        std::string customer_email = email_address;
        
        it = queryData.find("order_id");
        if ( it != queryData.end() ) {
            order_id = it->second;
            order_id = url_decode(order_id);
        } else {
            std::cout << "{\"error\": \"order_id is required\"}\n\n";
            return 0;
        }
        
        it = queryData.find("items");
        if ( it != queryData.end() ) {
            items_json = it->second;
            items_json = url_decode(items_json);
        } else {
            std::cout << "{\"error\": \"items is required\"}\n\n";
            return 0;
        }
        
        it = queryData.find("total");
        if ( it != queryData.end() ) {
            total_value = it->second;
            total_value = url_decode(total_value);
        } else {
            std::cout << "{\"error\": \"total is required\"}\n\n";
            return 0;
        }
        
        std::string response = record_web_store_order(order_id, customer_email, items_json, total_value, jUser["username"], password, database);
        std::cout << response << "\n\n";
        return 0;
    }
    else if ( command == "orderhistory" ) {
        std::string customer_email = email_address;
        
        if ( customer_email.empty() ) {
            std::cout << "{\"error\": \"Customer email not found\"}\n\n";
            return 0;
        }
        
        std::string response = get_order_history(customer_email, jUser["username"], password, database);
        std::cout << response << "\n\n";
        return 0;
    }
    else if ( command == "validatecart" ) {
        std::string items_json;
        
        it = queryData.find("items");
        if ( it != queryData.end() ) {
            items_json = it->second;
            items_json = url_decode(items_json);
        } else {
            std::cout << "{\"error\": \"items parameter is required\"}\n\n";
            return 0;
        }
        
        std::string response = validate_cart_inventory(items_json, jUser["username"], password, database);
        std::cout << response << "\n\n";
        return 0;
    }
    else if ( command == "salesreport" ) {
        std::string start_date, end_date;
        
        it = queryData.find("start_date");
        if ( it != queryData.end() ) {
            start_date = it->second;
            start_date = url_decode(start_date);
        } else {
            std::cout << "{\"error\": \"start_date parameter is required (YYYY-MM-DD)\"}\n\n";
            return 0;
        }
        
        it = queryData.find("end_date");
        if ( it != queryData.end() ) {
            end_date = it->second;
            end_date = url_decode(end_date);
        } else {
            std::cout << "{\"error\": \"end_date parameter is required (YYYY-MM-DD)\"}\n\n";
            return 0;
        }
        
        std::string response = get_sales_report(start_date, end_date, jUser["username"], password, database);
        std::cout << response << "\n\n";
        return 0;
    }
    else if ( command == "revenuereport" ) {
        std::string start_date, end_date;
        
        it = queryData.find("start_date");
        if ( it != queryData.end() ) {
            start_date = it->second;
            start_date = url_decode(start_date);
        } else {
            std::cout << "{\"error\": \"start_date parameter is required (YYYY-MM-DD)\"}\n\n";
            return 0;
        }
        
        it = queryData.find("end_date");
        if ( it != queryData.end() ) {
            end_date = it->second;
            end_date = url_decode(end_date);
        } else {
            std::cout << "{\"error\": \"end_date parameter is required (YYYY-MM-DD)\"}\n\n";
            return 0;
        }
        
        std::string response = get_revenue_report(start_date, end_date, jUser["username"], password, database);
        std::cout << response << "\n\n";
        return 0;
    }
    else if ( command == "inventoryreport" ) {
        std::string response = get_inventory_report(jUser["username"], password, database);
        std::cout << response << "\n\n";
        return 0;
    }
    else if ( command == "taxsummary" ) {
        std::string start_date, end_date;
        
        it = queryData.find("start_date");
        if ( it != queryData.end() ) {
            start_date = it->second;
            start_date = url_decode(start_date);
        } else {
            std::cout << "{\"error\": \"start_date parameter is required (YYYY-MM-DD)\"}\n\n";
            return 0;
        }
        
        it = queryData.find("end_date");
        if ( it != queryData.end() ) {
            end_date = it->second;
            end_date = url_decode(end_date);
        } else {
            std::cout << "{\"error\": \"end_date parameter is required (YYYY-MM-DD)\"}\n\n";
            return 0;
        }
        
        std::string response = get_tax_summary(start_date, end_date, jUser["username"], password, database);
        std::cout << response << "\n\n";
        return 0;
    }
    else if ( command == "getreceipt" ) {
        std::string order_id;
        
        it = queryData.find("order_id");
        if ( it != queryData.end() ) {
            order_id = it->second;
            order_id = url_decode(order_id);
        } else {
            std::cout << "{\"error\": \"order_id parameter is required\"}\n\n";
            return 0;
        }
        
        std::string response = get_receipt(order_id, jUser["username"], password, database);
        std::cout << response << "\n\n";
        return 0;
    }
    else if ( command == "initiate_payment" ) {
        std::string order_id, total_value, payment_type;
        std::string customer_email = email_address;
        
        it = queryData.find("order_id");
        if ( it != queryData.end() ) {
            order_id = it->second;
            order_id = url_decode(order_id);
        } else {
            std::cout << "{\"error\": \"order_id is required\"}\n\n";
            return 0;
        }
        
        it = queryData.find("total");
        if ( it != queryData.end() ) {
            total_value = it->second;
            total_value = url_decode(total_value);
        } else {
            std::cout << "{\"error\": \"total is required\"}\n\n";
            return 0;
        }
        
        it = queryData.find("type");
        if ( it != queryData.end() ) {
            payment_type = it->second;
            payment_type = url_decode(payment_type);
        } else {
            payment_type = "web_order";
        }

        // Create payment intent via Stripe
        std::string stripe_key = m_configuration["stripe_secret_key"];
        if (stripe_key.empty()) {
            std::cout << "{\"error\": \"Stripe not configured\"}\n\n";
            return 0;
        }

        double amount_double = std::stod(total_value);
        int amount_cents = (int)(amount_double * 100);
        
        StripePayment stripe(stripe_key);
        std::string metadata = "{\"order_id\": \"" + order_id + "\", \"type\": \"" + payment_type + "\"}";
        std::string response = stripe.createPaymentIntent(
            amount_cents,
            "gbp",
            customer_email,
            "Online Order " + order_id,
            metadata
        );
        
        std::cout << response << "\n\n";
        return 0;
    }
    else if ( command == "confirm_payment" ) {
        std::string payment_intent_id, order_id;
        std::string customer_email = email_address;
        
        it = queryData.find("payment_intent_id");
        if ( it != queryData.end() ) {
            payment_intent_id = it->second;
            payment_intent_id = url_decode(payment_intent_id);
        } else {
            std::cout << "{\"error\": \"payment_intent_id is required\"}\n\n";
            return 0;
        }
        
        it = queryData.find("order_id");
        if ( it != queryData.end() ) {
            order_id = it->second;
            order_id = url_decode(order_id);
        } else {
            std::cout << "{\"error\": \"order_id is required\"}\n\n";
            return 0;
        }

        try {
            std::string stripe_key = m_configuration["stripe_secret_key"];
            StripePayment stripe(stripe_key);
            std::string payment_status = stripe.getPaymentIntentStatus(payment_intent_id);
            
            std::string status_value = "pending";
            std::size_t status_pos = payment_status.find("\"status\":");
            if (status_pos != std::string::npos) {
                std::size_t quote_start = payment_status.find("\"", status_pos + 10);
                std::size_t quote_end = payment_status.find("\"", quote_start + 1);
                if (quote_start != std::string::npos && quote_end != std::string::npos) {
                    status_value = payment_status.substr(quote_start + 1, quote_end - quote_start - 1);
                }
            }

            std::cout << "{\"success\": true, \"payment_intent_id\": \"" << payment_intent_id << 
                       "\", \"status\": \"" << status_value << "\"}\n\n";
        } catch (const std::exception& e) {
            std::cout << "{\"error\": \"" << e.what() << "\"}\n\n";
        }
        return 0;
    }
    else if ( command == "till_card_sale" ) {
        std::string operator_id, total_value;
        std::string customer_email = email_address;
        
        it = queryData.find("operator_id");
        if ( it != queryData.end() ) {
            operator_id = it->second;
            operator_id = url_decode(operator_id);
        } else {
            operator_id = "unknown";
        }
        
        it = queryData.find("total");
        if ( it != queryData.end() ) {
            total_value = it->second;
            total_value = url_decode(total_value);
        } else {
            std::cout << "{\"error\": \"total is required\"}\n\n";
            return 0;
        }

        try {
            std::random_device rd;
            std::mt19937 gen(rd());
            std::uniform_int_distribution<> dis(100000, 999999);
            std::string till_trans_id = "TILL_" + std::to_string(dis(gen));

            std::string stripe_key = m_configuration["stripe_secret_key"];
            StripePayment stripe(stripe_key);
            
            double amount_double = std::stod(total_value);
            int amount_cents = (int)(amount_double * 100);
            
            std::string metadata = "{\"till_operator\": \"" + operator_id + 
                                  "\", \"till_trans_id\": \"" + till_trans_id + "\"}";
            
            std::string response = stripe.createPaymentIntent(
                amount_cents,
                "gbp",
                customer_email,
                "Till Sale - " + till_trans_id,
                metadata
            );

            std::cout << "{\"success\": true, \"till_transaction_id\": \"" << till_trans_id << "\"}\n\n";
        } catch (const std::exception& e) {
            std::cout << "{\"error\": \"" << e.what() << "\"}\n\n";
        }
        return 0;
    }
    else if ( command == "process_refund" ) {
        std::string payment_intent_id, reason;
        
        it = queryData.find("payment_intent_id");
        if ( it != queryData.end() ) {
            payment_intent_id = it->second;
            payment_intent_id = url_decode(payment_intent_id);
        } else {
            std::cout << "{\"error\": \"payment_intent_id is required\"}\n\n";
            return 0;
        }
        
        it = queryData.find("reason");
        if ( it != queryData.end() ) {
            reason = it->second;
            reason = url_decode(reason);
        } else {
            reason = "requested_by_customer";
        }

        try {
            std::string stripe_key = m_configuration["stripe_secret_key"];
            StripePayment stripe(stripe_key);
            std::string response = stripe.refundPayment(payment_intent_id, 0, reason);
            
            std::cout << response << "\n\n";
        } catch (const std::exception& e) {
            std::cout << "{\"error\": \"" << e.what() << "\"}\n\n";
        }
        return 0;
    }
    else if ( command == "predict_daily_sales" ) {
        // Forecast today's sales based on last 10 same days of week
        std::string user = jUser["username"];
        std::string query = forecast_daily_sales(user, password, database);
        
        try {
            Postgresql pgbc = Postgresql( user, password, "localhost", "5432", database );
            if ( pgbc._isConnected ) {
                std::string resp = pgbc.runCommand(query);
                std::string error = pgbc.getLastError();
                pgbc.close();
                
                if (!error.empty()) {
                    std::cout << "{\"error\": \"Query failed: " << error << "\"}\n\n";
                    return 0;
                }
                
                // Parse response and use Boudica for prediction
                std::string forecast_prompt = "Based on this sales data in JSON format: " + resp + 
                                             ", predict today's sales using statistical analysis and machine learning. "
                                             "Return a JSON object with predicted_sales, confidence_level, and explanation.";
                std::string boudica_forecast = call_boudica(forecast_prompt);
                
                std::cout << "{\"daily_sales_data\": " << resp << ", \"boudica_forecast\": " << boudica_forecast << "}\n\n";
            } else {
                std::cout << "{\"error\": \"Database connection failed\"}\n\n";
                return 0;
            }
        } catch (const std::exception& e) {
            std::cout << "{\"error\": \"" << e.what() << "\"}\n\n";
        }
        return 0;
    }
    else if ( command == "predict_weekly_sales" ) {
        // Forecast this week's sales based on last 10 same weeks
        std::string user = jUser["username"];
        std::string query = forecast_weekly_sales(user, password, database);
        
        try {
            Postgresql pgbc = Postgresql( user, password, "localhost", "5432", database );
            if ( pgbc._isConnected ) {
                std::string resp = pgbc.runCommand(query);
                std::string error = pgbc.getLastError();
                pgbc.close();
                
                if (!error.empty()) {
                    std::cout << "{\"error\": \"Query failed: " << error << "\"}\n\n";
                    return 0;
                }
                
                // Parse response and use Boudica for prediction
                std::string forecast_prompt = "Based on this weekly sales data in JSON format: " + resp + 
                                             ", predict this week's sales using statistical analysis and machine learning. "
                                             "Return a JSON object with predicted_sales, confidence_level, trend, and explanation.";
                std::string boudica_forecast = call_boudica(forecast_prompt);
                
                std::cout << "{\"weekly_sales_data\": " << resp << ", \"boudica_forecast\": " << boudica_forecast << "}\n\n";
            } else {
                std::cout << "{\"error\": \"Database connection failed\"}\n\n";
                return 0;
            }
        } catch (const std::exception& e) {
            std::cout << "{\"error\": \"" << e.what() << "\"}\n\n";
        }
        return 0;
    }
    else if ( command == "predict_monthly_sales" ) {
        // Forecast this month's sales based on last 10 same months
        std::string user = jUser["username"];
        std::string query = forecast_monthly_sales(user, password, database);
        
        try {
            Postgresql pgbc = Postgresql( user, password, "localhost", "5432", database );
            if ( pgbc._isConnected ) {
                std::string resp = pgbc.runCommand(query);
                std::string error = pgbc.getLastError();
                pgbc.close();
                
                if (!error.empty()) {
                    std::cout << "{\"error\": \"Query failed: " << error << "\"}\n\n";
                    return 0;
                }
                
                // Parse response and use Boudica for prediction
                std::string forecast_prompt = "Based on this monthly sales data in JSON format: " + resp + 
                                             ", predict this month's total sales using statistical analysis and seasonal trends. "
                                             "Return a JSON object with predicted_sales, confidence_level, seasonal_trend, and explanation.";
                std::string boudica_forecast = call_boudica(forecast_prompt);
                
                std::cout << "{\"monthly_sales_data\": " << resp << ", \"boudica_forecast\": " << boudica_forecast << "}\n\n";
            } else {
                std::cout << "{\"error\": \"Database connection failed\"}\n\n";
                return 0;
            }
        } catch (const std::exception& e) {
            std::cout << "{\"error\": \"" << e.what() << "\"}\n\n";
        }
        return 0;
    }
    else if ( command == "predict_reorder_date" ) {
        // Predict when an item needs reordering based on sales velocity
        std::string barcode;
        it = queryData.find("barcode");
        if ( it != queryData.end() ) {
            barcode = it->second;
            barcode = url_decode(barcode);
        } else {
            std::cout << "{\"error\": \"barcode parameter is required\"}\n\n";
            return 0;
        }
        
        std::string user = jUser["username"];
        std::string query = predict_reorder_date(barcode, user, password, database);
        
        try {
            Postgresql pgbc = Postgresql( user, password, "localhost", "5432", database );
            if ( pgbc._isConnected ) {
                std::string resp = pgbc.runCommand(query);
                std::string error = pgbc.getLastError();
                pgbc.close();
                
                if (!error.empty()) {
                    std::cout << "{\"error\": \"Query failed: " << error << "\"}\n\n";
                    return 0;
                }
                
                // Parse response and use Boudica for reorder prediction
                std::string reorder_prompt = "Based on this inventory and sales data in JSON format: " + resp + 
                                            ", predict when this item needs to be reordered. "
                                            "Consider current stock level, average daily sales velocity, and supplier lead times. "
                                            "Return a JSON object with days_until_reorder, recommended_quantity, priority (urgent/normal/low), and explanation.";
                std::string boudica_prediction = call_boudica(reorder_prompt);
                
                std::cout << "{\"item_data\": " << resp << ", \"reorder_prediction\": " << boudica_prediction << "}\n\n";
            } else {
                std::cout << "{\"error\": \"Database connection failed\"}\n\n";
                return 0;
            }
        } catch (const std::exception& e) {
            std::cout << "{\"error\": \"" << e.what() << "\"}\n\n";
        }
        return 0;
    }
    else {
        std::cout << "{\"error\": \"Command not recognised. Please check your command and try again.\"}\n\n";
        return 0;  
    }
    std::cout << "{\"error\": \"Command not recognised. Please check your command and try again.\"}\n\n";
    return 0;
}