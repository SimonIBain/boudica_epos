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




#ifndef ENVORONMENT_H
#define ENVORONMENT_H
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
class Environment {
    public:
    Environment(){getVariables();}
    using container = std::map<Key, Value>;
    using iterator = typename container::iterator;
    using const_iterator = typename container::const_iterator;

    iterator begin() { return env.begin(); }
    iterator end() { return env.end(); }
    iterator find(const std::string data) { 
        return env.find(data);
    }
    const_iterator begin() const { return env.begin(); }
    const_iterator end() const { return env.end(); }

    //Additionals
    iterator findAt(size_t pos) {
        std::map<std::string, std::string>::iterator itr;
        int curr = 0;
        for (  itr = env.begin(); itr != env.end(); ++itr ) {
            if ( curr == pos ) {
                return itr;
            } else { curr++; } 
        }
        itr = env.end();
        return itr;
    }

    iterator findValue(Value val) {
        std::map<std::string, std::string>::iterator itr;
        int curr = 0;
        for (  itr = env.begin(); itr != env.end(); ++itr ) {
            if ( itr->second == val ) {
                return itr;
            }
        }
        itr = env.end();
        return itr;
    } 

    iterator findKey(Key key) {
        std::map<std::string, std::string>::iterator itr;
        int curr = 0;
        for (  itr = env.begin(); itr != env.end(); ++itr ) {
            if ( itr->first == key ) {
                return itr;
            }
        }
        itr = env.end();
        return itr;
    }                

    private:
    std::map<std::string, std::string>env;
    void getVariables() {
        extern char **environ;
        char **ch = environ;
        for (; *ch; ch++) {
            std::string pair = *ch;
            size_t pos = pair.find("=");
            if ( pos != std::string::npos ) {
#ifdef WEBDEBUG 
//    std::cout << pair << "<br/>";
#endif 
                env.insert ( std::pair<std::string, std::string>(pair.substr(0, pos), pair.substr(pos+1)));
            }
        }
    }
};
#endif
