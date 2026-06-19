/** Copyright OmniIndex Inc 2024
* Authors: Simon Ian Bain sibain@omniindex.io
* Realease data --/--/----
* Build version 0.00.00.0000.1
* License currently proprietory
*/

#ifndef STRING_H
#define STRING_H

#include <string>
#include <string.h>
#include <algorithm>

/* Omniindex includex */
#include "cryptography.h"

namespace oidx {
    class string {
        public:
         /* Constructors. We have 5. The standard */
         string(){};
         /* The copy */
         string(string& str){}
         /* The move */
         string(string&& str){}
         /** Others  */
         string(int i) { String = std::to_string(i).c_str(); }
         /* The paramatized one. If the file does not exists it will be created
          * @param const char*
        */
         string(const char* str) { String = str; }
         /* and the operator If the file does not exists it will be created*/
         void operator = (const char* str ) { String = str; } 
         void operator = (oidx::string str ) { String = str.c_str(); }
         void operator = (int i) { String = std::to_string(i).c_str(); } 
         void operator = (long l) { String = std::to_string(l).c_str(); }
         void operator = (double d) { String = std::to_string(d).c_str(); }

         /** Operators */
         void operator += (const char* str ) { 
            std::string _str = String;
            _str += str;
            String = (char *) malloc( _str.size()+1 );
            strcpy((char*)String, (char*)_str.c_str()); 
         }

         void operator += (char* str ) { 
            std::string _str = String;
            _str += str;
            String = (char *) malloc( _str.size()+1 );
            strcpy((char*)String, (char*)_str.c_str()); 
         }

         void operator += (char str ) { 
            std::string _str = String;
            _str += str;
            String = (char *) malloc( _str.size()+1 );
            strcpy((char*)String, (char*)_str.c_str()); 
         }                  

         bool operator == (const char* str) { 
            if ( strcmp ( String, str ) == 0 ) { return true; }
            return false;
         }

         bool operator != (const char* str) { 
            if ( strcmp ( String, str ) == 0 ) { return false; }
            return true;
         }         

         char operator [] (size_t pos) { 
            std::string _str = String;
            return _str[pos];
         }

         /** Methods */
         
         /** This method will lowercase the string. It will return a std::string so that
          * It is easier to do a comparison against it
          * @return std::string
          */
         std::string toLower() {
            std::string _str = String;
            std::transform(_str.begin(), _str.end(), _str.begin(), ::tolower);
            String = (char *) malloc( _str.size()+1 );
            strcpy((char*)String, (char*)_str.c_str());              
            return _str;
         }

         /** This method will uppercase the string. It will return a std::string so that
          * It is easier to do a comparison against it
          * @return std::string
          */
         std::string toUpper() {
            std::string _str = String;
            std::transform(_str.begin(), _str.end(), _str.begin(), ::toupper);
            String = (char *) malloc( _str.size()+1 );
            strcpy((char*)String, (char*)_str.c_str());              
            return _str;
         }

         size_t find(const char* str) {
            std::string _str = String;
            std::string _find = str;
            return _str.find(_find);
         }

         size_t find(char str) {
            std::string _str = String;
            return _str.find(str);
         }         

         size_t find_last_of(const char* str) {
            std::string _str = String;
            std::string _find = str;
            return _str.find_last_of(_find);
         }         

         bool contains(const char* str) {
            std::string _str = String;
            if ( _str.find(str) != std::string::npos ) { return true; }
            return false;
         }

         bool contains(char str) {
            std::string _str = String;
            if ( _str.find(str) != std::string::npos ) { return true; }
            return false;
         }         

         const char* substr(size_t start, size_t end = 0) {
            std::string _str = String;
            if ( end == 0 && start < _str.length() ) {
                _str = _str.substr(start).c_str();
            } else if (start < _str.length() && end <= _str.length() ) {
                _str = _str.substr(start, end).c_str();
            } else { return ""; }
            const char* ret = (char *) malloc( _str.size()+1 );
            strcpy((char*)ret, (char*)_str.c_str());   
            return ret;           
         }

         void erase(size_t start, size_t end = 0 ) {
            std::string _str = String;
            if ( end == 0 && start < _str.length() ) {
                _str.erase( start );
            } else if (start < _str.length() && end <= _str.length() ) {
                _str = _str.erase(start, end);
            }
            String = (char *) malloc( _str.size()+1 );
            strcpy((char*)String, (char*)_str.c_str());          
         }

         void insert(size_t start, const char* str) {
            std::string _str = String;
            if ( start <= _str.length() -1 ) {
                _str.insert(start, str);
            }
            String = (char *) malloc( _str.size()+1 );
            strcpy((char*)String, (char*)_str.c_str());                
         }

         void replace(const char* str, const char* rep_str) {
            std::string _str = String;
            std::string _find = str;
            std::string _replace = rep_str;
            for ( size_t sz_find = _str.find(str); sz_find != std::string::npos; sz_find = _str.find(str) ) {
                _str.erase(sz_find, _find.length());
                _str.insert(sz_find, _replace);
            }
            String = (char *) malloc( _str.size()+1 );
            strcpy((char*)String, (char*)_str.c_str()); 
         }

         size_t length() {
            return strlen(String);
         }

         void clear() { 
            String = (char *) malloc( 2 ); 
            String = "";/* Make sure it is initialized */
         }

         /** Here we will strip all spaces at teh start and the 
          * end of teh string
          * @return std::string for comparisons
          */
         std::string trim() {
            std::string _str = String;
            for ( size_t sz_find = _str.find(" "); sz_find == 0; sz_find = _str.find(" ") ) { _str.erase ( 0, 1 ); }
            for ( size_t sz_find = _str.find(" "); sz_find == _str.length(); sz_find = _str.find(" ") ) { _str.erase ( _str.length() -1, 1 ); }
            String = (char *) malloc( _str.size()+1 );
            strcpy((char*)String, (char*)_str.c_str()); 
            return _str;            
         }

         const char* c_str() { return String; }

         /** This function will return a std::string
          * @return std::string
          */
         std::string str() {
            std::string _str = String;
            return _str;
         }

         void encrypt(const char* key) {
            std::string _str = Crypto::encrypt(String, key);
            String = (char *) malloc( _str.size()+1 );
            strcpy((char*)String, (char*)_str.c_str()); 
         }

         void decrypt(const char* key) {
            std::string _str = Crypto::decrypt(String, key);
            String = (char *) malloc( _str.size()+1 );
            strcpy((char*)String, (char*)_str.c_str()); 
         } 

         bool isdigit() {
            for (int i = 0; i <= length(); ++i) {
               if (std::isdigit(i)) {
                  return false;
               }
            }
            if ( length() < 0 ) { return false; }
            return true;
         } 

         std::vector< std::vector<const char*> > get_json_array() {
            std::vector< std::vector<const char*> >v_array;
            std::vector<const char*>v_record;
            oidx::string _str;
            _str = String;
            _str.replace("{{", "{");
            _str.replace("}}", "}");
            for ( size_t sz_find = _str.find("}"); sz_find != std::string::npos; sz_find = _str.find("}") ) {
               if ( v_record.size() > 0 ) { v_array.push_back(v_record); }
               v_record.clear();
               oidx::string record;
               record = _str.substr(0, sz_find);
               _str.erase ( 0, sz_find + 1);
               for ( size_t sz_find2 = record.find("\":"); sz_find2 != std::string::npos; sz_find2 = record.find("\":") ) {
                  record.erase ( 0, sz_find2 + 2);
                  sz_find2 = record.find("\"");
                  if ( sz_find2 != std::string::npos ) { record.erase (0, sz_find2 + 1); }
                  sz_find2 = record.find("\"");
                  if ( sz_find2 != std::string::npos ) { 
                     oidx::string item;
                     item = record.substr(0, sz_find2);
                     item.trim();
                     record.erase (0, sz_find2 + 1);
                     const char* ch_str = (char *) malloc( item.length() +1 );
                     strcpy((char*)ch_str, (char*)item.c_str());                      
                     v_record.push_back(ch_str);
                  }                  
               }
            }
            if ( v_record.size() > 0 ) { v_array.push_back(v_record); }
            return v_array;
         }       

         private:
         const char* String;
    };
}

#endif