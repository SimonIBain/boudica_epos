#include <algorithm>
#include <fstream>
#include <time.h>
#include <chrono>
#include <iomanip>
#include <chrono>
#include <ctime> 
#include <random>
#include <sys/types.h>
#include <sys/stat.h>
#include <string.h>

#include "includes/utils.h"


using namespace OmniIndex::Utils;

void Utils::ltrim(std::string &data) {
    data.erase(data.begin(), std::find_if(data.begin(), data.end(), [](int ch) {
       return !std::isspace(ch);
    }));
}

// trim from end (in place)
void Utils::rtrim(std::string &data) {
    data.erase(std::find_if(data.rbegin(), data.rend(), [](int ch) {
        return !std::isspace(ch);
    }).base(), data.end());
}

void Utils::trim(std::string &data) {
    ltrim(data);
    rtrim(data);
}

std::string Utils::replace(std::string &data, std::string find, std::string replacement) {
    std::string tmp = data;
    Utils::toLower(tmp);
    std::string lwr_find = find;
    Utils::toLower(lwr_find);
    std::string new_str = "";
    size_t found = tmp.find(lwr_find);
    while ( found != std::string::npos ) {
        new_str += data.substr(0, found) + replacement;
        tmp.erase (0, found +find.length());
        data.erase (0, found +find.length());
        found = tmp.find(lwr_find);
    }
    new_str += data;
    data = new_str;
    return data;
}

std::vector<std::string> Utils::split(std::string data, const std::string iter) {
    std::vector<std::string> split;
    for ( size_t pos = data.find(iter); pos != std::string::npos; pos = data.find(iter)) {
        split.push_back(data.substr(0, pos));
        data.erase(0, pos + iter.length());
    }
    split.push_back(data);
    return split;
}

void Utils::toLower(std::string& data) {
    std::for_each(data.begin(), data.end(), [](char & c) {
        c = ::tolower(c);
    });  
}

int Utils::append(const std::string fileName, const std::string data) {
    std::ofstream file;
    file.open(fileName, std::ios_base::app | std::ios_base::out);
    if ( file.is_open() ) {
        file << data;   
        file.close();
        return 0;
    } else {
        return -1;
    }
    return -2;
}

bool Utils::getTime(long ticks) {
    time_t rawtime = ticks;
    auto current = std::chrono::system_clock::now();
    time_t tt = std::chrono::system_clock::to_time_t(current);

    tm now_tt = *gmtime(&tt);
    now_tt.tm_year = now_tt.tm_year + 1900;
    now_tt.tm_mon = now_tt.tm_mon + 1;
    tm then_tm = *localtime(&rawtime);
    then_tm.tm_year = then_tm.tm_year + 1900;
    then_tm.tm_mon = then_tm.tm_mon + 1;
    bool is_cool = false;
    if ( then_tm.tm_year >= now_tt.tm_year ) {
        if ( then_tm.tm_mon >= now_tt.tm_mon ) {
            if ( then_tm.tm_hour >= now_tt.tm_hour ) {
                if ( then_tm.tm_min >= now_tt.tm_min ) { is_cool = true;  }        
            } 
        }
    }
    return is_cool;
}

bool Utils::timeComparison(std::string time_1, std::string time_2) {
    // This function is refactored to use C++11/17 compatible features,
    // as std::chrono::parse requires C++20.
    const std::string format = "%Y-%m-%d %H:%M:%S";

    // Helper lambda to parse a string into a time_point
    auto string_to_tp = [&](const std::string& time_str) {
        std::tm tm = {};
        std::stringstream ss(time_str);
        ss >> std::get_time(&tm, format.c_str());

        if (ss.fail()) {
            // Return epoch on parsing failure
            return std::chrono::system_clock::from_time_t(0);
        }
        // Note: std::mktime interprets the tm struct as local time.
        std::time_t time = std::mktime(&tm);
        return std::chrono::system_clock::from_time_t(time);
    };

    auto time_point_1 = string_to_tp(time_1);
    auto time_point_2 = string_to_tp(time_2);

    // Return true if time_1 is the same as or later than time_2
    return time_point_1 >= time_point_2;
}

std::string Utils::getCurrentUTCTime () {
    std::chrono::system_clock::time_point time_now = std::chrono::system_clock::now(); 
    std::string date_format = "%Y-%m-%d %H:%M:%S";
    auto itt = std::chrono::system_clock::to_time_t(time_now);
    std::stringstream ss;
    ss << std::put_time(gmtime(&itt), date_format.c_str());
    std::string str_time = ss.str();
    return str_time;
}


std::string Utils::deleteControls ( std::string data ) {
    std::string s_ret = "";
    for ( size_t sz_pos = 0; sz_pos < data.length(); ++sz_pos ) {
        std::string s_ch = data.substr(sz_pos, 1);
        if ( std::count_if(s_ch.begin(), s_ch.end(), [](unsigned char c){ return std::isprint(c); }   ) ) {
            s_ret += s_ch;
        }
    }
    return s_ret;
}

std::string Utils::get_uuid() {
    static std::random_device dev;
    static std::mt19937 rng(dev());
    std::uniform_int_distribution<int> dist(0, 15);
    const char *v = "0123456789zqspgt";
    const bool dash[] = { 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0 };
    std::string res;
    for (int i = 0; i < 16; i++) {
        if (dash[i]) res += "-";
        res += v[dist(rng)];
        res += v[dist(rng)];
    }
    return res;
}

std::string Utils::create_ean_code() {
    static std::random_device dev;
    static std::mt19937 rng(dev());
    std::uniform_int_distribution<int> dist(0, 9);
    std::string res;
    for (int i = 0; i < 12; i++) {
        res += std::to_string(dist(rng));
    }
    return res;
}

bool Utils::file_exists(const std::string file) {
    struct stat fileInfo;
    if (stat(file.c_str(), &fileInfo) != 0) { return false; }
    else { return true; }
}

std::string Utils::file_open(const std::string file) {
    struct stat fileInfo;
    if (stat(file.c_str(), &fileInfo) != 0) { return ""; } 

    std::ifstream strm_schema (file.c_str());
    std::string data = "";
    if ( strm_schema.is_open() ) {
        std::string line;
        for ( std::string line; getline(strm_schema, line);) {          
            data += line + "\n";                   
        }          
        strm_schema.close();
    }    
    return data;
}

std::string Utils::uuDecode(std::string input){
    std::string decoded;
    char ch;
    size_t sz_len = input.length();
    unsigned int i, ii;

    for (i=0; i < sz_len; i++){
        if(input[i] != '%'){
            decoded += input[i];
        }else{
            sscanf(input.substr(i + 1, 2).c_str(), "%x", &ii);
            ch = static_cast<char>(ii);
            decoded += ch;
            i = i + 2;
        }
    }
    return decoded;
}

std::string Utils::stripNonAlphaNumeric (std::string in) {
    std::replace_if(std::begin(in), std::end(in), isAlphaNumeric, ' ');
    return in;
}

bool Utils::isAlphaNumeric(char ch) {
    return std::isalnum(static_cast<unsigned char>(ch));
}

bool Utils::is_predicate(char c ) {
    return !isalpha( c );
}

std::string Utils::normalize(std::string data) {
    data = stripNonAlphaNumeric(data);
    /** shouold not really be here... */
    data = replace(data, "(", " ");
    data = replace(data, ")", " ");
    data = replace(data, "}", " ");
    data = replace(data, "{", " ");
    data = replace(data, ",", " ");
    data = replace(data, ";", " ");
    data = replace(data, "_", " ");
    data = replace(data, "'", "");
    data = replace(data, "`", "");
    data = replace(data, "\"", " ");
    data = replace(data, "%", " ");
    data = replace(data, "’", " ");
    data = replace(data, "‘", " ");
    data = replace(data, ".", " ");
    data = replace(data, "          ", " ");
    data = replace(data, "        ", " ");
    data = replace(data, "    ", " ");
    data = replace(data, "  ", " ");
    toLower(data);
    return data;
}

std::string Utils::get_key(const std::string& key, const std::string& data) {
    std::string value = data;
    size_t sz_pos = value.find ( "\"" + key + "\"" );
    if ( sz_pos != std::string::npos ) {
        value.erase ( 0, sz_pos + (key.length() + 2) );
        sz_pos = value.find("\"");
        if ( sz_pos != std::string::npos ) {
            value.erase ( 0, sz_pos + 1);
            sz_pos = value.find("\",");
            if ( sz_pos == std::string::npos ) {
                sz_pos = value.find_last_of("}");
            }
            if ( sz_pos != std::string::npos ) {
                value.erase ( sz_pos );
                return value;
            } else {
                return "";
            }
        } else {
            return "";
        }
    }
    return ""; 
}

std::vector<std::vector<std::string> > Utils::get_configuration() {
    std::vector<std::string> folder_data;
    std::vector<std::string> watched_data;
    std::vector<std::string> not_watched_data;
    std::vector<std::vector<std::string> > configuration_data;


    std::string conf = OmniIndex::Utils::Utils::file_open("../conf/kensai.conf");
    if ( conf.length() <= 0 ) {
        conf = OmniIndex::Utils::Utils::file_open("./conf/kensai.conf");
    }
    std::string tmp = conf;
    size_t sz_found = tmp.find("\nwatched folders");
    if ( sz_found != std::string::npos ) {
        tmp.erase ( 0, sz_found + 16 );
        sz_found = tmp.find("\n");
        if ( sz_found != std::string::npos ) {
            tmp.erase ( sz_found );
            folder_data = OmniIndex::Utils::Utils::split(tmp, ",");
        }        
    }

    tmp = conf;
    sz_found = tmp.find("\ndo not watch");
    if ( sz_found != std::string::npos ) {
        tmp.erase ( 0, sz_found + 13 );
        sz_found = tmp.find("\n");
        if ( sz_found != std::string::npos ) {
            tmp.erase ( sz_found );
            tmp = OmniIndex::Utils::Utils::replace(tmp, " ", "");
            not_watched_data = OmniIndex::Utils::Utils::split(tmp, ",");
        }        
    }

    tmp = conf; 
    sz_found = tmp.find("\nwatch for");
    if ( sz_found != std::string::npos ) {
        tmp.erase ( 0, sz_found + 10 );
        sz_found = tmp.find("\n");
        if ( sz_found != std::string::npos ) {
            tmp.erase ( sz_found );
            tmp = OmniIndex::Utils::Utils::replace(tmp, " ", "");
            watched_data = OmniIndex::Utils::Utils::split(tmp, ",");
        }        
    } 
    configuration_data.push_back(folder_data);   
    configuration_data.push_back(not_watched_data);   
    configuration_data.push_back(watched_data);  
    return configuration_data;  
}

std::string Utils::exec(const std::string command) {
    char buffer[160];
    FILE *foo;
    std::string cmd = command;
    cmd += " 2>/dev/null";
    foo = popen(cmd.c_str(), "r");
    std::string out;
    while (fgets(buffer, 160, foo) != NULL)
    {
        std::string buf(buffer);
        out += buf;
    }
    pclose(foo);
    //std::cout << "\33[2K\r" << std::flush;    
    char* str = (char *) malloc( out.size()+1 );
    strcpy(str, (const char*)out.c_str());
    return str;
}
