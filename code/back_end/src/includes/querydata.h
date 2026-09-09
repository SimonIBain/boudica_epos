/** 
 * Copyright (c) [2024] [OmniIndex Inc.]

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
**/




#ifndef QUERY_DATA_H
#define QUERY_DATA_H
#pragma once

#include <map>
#include <string>
#include <vector>
#include <stdio.h>

/** Thanks to 
 * https://stackoverflow.com/users/3590/hamishmcn
 * and
 * https://stackoverflow.com/users/65863/remy-lebeau
 * for the iteration
 */ 
    /**This is a templated class that allows us to iterate
     * through the env without oppening
     * them up to injection attacks
     * @param Key std:::string
     * @param Value std::string
     */ 
template <class Key,  class Value>
class QueryData {
    public:
    QueryData(std::string data){getQueryData(data);}
    using container = std::map<Key, Value>;
    using iterator = typename container::iterator;
    using const_iterator = typename container::const_iterator;

    iterator begin() { return _query.begin(); }
    iterator end() { return _query.end(); }
    iterator find(const std::string data) { 
        return _query.find(data);
    }
    const_iterator begin() const { return _query.begin(); }
    const_iterator end() const { return _query.end(); }

    //Additionals
    iterator findAt(size_t pos) {
        std::map<std::string, std::string>::iterator itr;
        int curr = 0;
        for (  itr = _query.begin(); itr != _query.end(); ++itr ) {
            if ( curr == pos ) {
                return itr;
            } else { curr++; } 
        }
        itr = _query.end();
        return itr;
    }

    iterator findValue(Value val) {
        std::map<std::string, std::string>::iterator itr;
        int curr = 0;
        for (  itr = _query.begin(); itr != _query.end(); ++itr ) {
            if ( itr->second == val ) {
                return itr;
            }
        }
        itr = _query.end();
        return itr;
    } 

    iterator findKey(Key key) {
        std::map<std::string, std::string>::iterator itr;
        int curr = 0;
        for (  itr = _query.begin(); itr != _query.end(); ++itr ) {
            if ( itr->first == key ) {
                return itr;
            }
        }
        itr = _query.end();
        return itr;
    }  

    Value operator []( Key key ) {
        return findKey(key)->second;
    }  

    iterator operator []( size_t pos ) {
        return findAt(pos);
    }          

    private:
    std::map<std::string, std::string>_query;
    void getQueryData(std::string data) {

        for ( size_t sz_pos = data.find("="); sz_pos != std::string::npos; sz_pos = data.find("=") ) {
            std::string key, value;
            key = data.substr(0, sz_pos);
            data.erase ( 0, sz_pos + 1);
            size_t sz_pair = data.find("&");
            if ( sz_pair == std::string::npos ) { value = data; }
            else {
                value = data.substr(0, sz_pair);
                data.erase ( 0, sz_pair + 1);
            }
            if ( key.length() > 0 ) {

                #ifdef WEBDEBUG 
                    std::cout << key << " " << value << "<br/>";
                #endif 

                _query.insert(std::pair<std::string, std::string>(key, value));
            }
        }

    }
};
#endif
