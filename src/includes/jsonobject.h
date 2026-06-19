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




#ifndef JSONOBJECT_H
#define JSONOBJECT_H
#pragma once

#include <unordered_map>
#include <string>
#include <vector>
#include <stdio.h>
#include <iostream>

#include "utils.h"

template <class Key,  class Value>
class JSON {
    public:
    JSON(std::string json){getValues(json);}
    using container = std::vector<Key>;
    using iterator = typename container::iterator;
    using const_iterator = typename container::const_iterator;

    iterator begin() { return keys.begin(); }
    iterator end() { return keys.end(); }
    std::string find(const std::string data) {
        for ( size_t current = 0; current < keys.size(); ++current ) {
            if ( keys[current] == data ) {
                return values[current];
            }
        }
        return "";

    }
    const_iterator begin() const { return keys.begin(); }
    const_iterator end() const { return keys.end(); }

    Key getKey(size_t position) {
        if ( position < keys.size() ) { return keys[position]; }
        else { return ""; }
    }

    Value getValue(size_t position) {
        if ( position < values.size() ) { 
            std::string val = values[position];
            if ( val.find("}") == val.size() -1 && val.find("}") != std::string::npos ) {
                val.erase(val.size() -1, 1 );
            }         
            return val; 
        }
        else { return ""; }
    }

    size_t size() {
        return keys.size();
    }    

    Value operator []( const std::string key ) {
        std::string val = find(key);
        if ( val.find("}") == val.size() -1 && val.find("}") != std::string::npos ) {
            val.erase(val.size() -1, 1 );
        } 
        val = OmniIndex::Utils::Utils::deleteControls(val);
        OmniIndex::Utils::Utils::trim(val);
        return val;         
    }

    Value operator []( const size_t i) {
        std::string val = this->values[i];
        if ( val.find("}") == val.size() -1 && val.find("}") != std::string::npos ) {
            val.erase(val.size() -1, 1 );
        } 
        return val;       
    }

    //Additionals
    iterator findAt(size_t pos) {
        std::vector<std::string>::iterator itr;
        int curr = 0;
        for (  itr = values.begin(); itr != values.end(); ++itr ) {
            if ( curr == pos ) {
                return itr;
            } else { curr++; } 
        }
        itr = values.end();
        return itr;
    }

    iterator findValue(Value val) {
        std::vector<std::string>::iterator itr;
        int curr = 0;
        for (  itr = values.begin(); itr != values.end(); ++itr ) {
            if ( itr == val ) {
                return itr;
            }
        }
        itr = values.end();
        return itr;
    } 

    Value findKey(Key key) {
        std::vector<std::string>::iterator itr;
        int curr = 0;
        std::string val;
        for (  itr = keys.begin(); itr != keys.end(); ++itr ) {
            if ( *itr == key) {
                val = values[curr];
                if ( val.find("}") == val.size() -1 && val.find("}") != std::string::npos ) {
                    val.erase(val.size() -1, 1 );
                } 
                return val;
            }
            ++curr;
        }
        itr = keys.end();
        return val;
    }

    std::vector<Value> toArray(std::string schema, std::string key, std::string jObj) {
        jObj = OmniIndex::Utils::Utils::replace(jObj, "\n", ""); 
        jObj = OmniIndex::Utils::Utils::replace(jObj, "\"", ""); 
        jObj = OmniIndex::Utils::Utils::replace(jObj, "{ ", "{");
        jObj = OmniIndex::Utils::Utils::replace(jObj, "{", "{\"");
        jObj = OmniIndex::Utils::Utils::replace(jObj, " }", "\"}");
        jObj = OmniIndex::Utils::Utils::replace(jObj, " : ", ":");
        jObj = OmniIndex::Utils::Utils::replace(jObj, ":", "\":\"");
        jObj = OmniIndex::Utils::Utils::replace(jObj, " , ", ",");
        jObj = OmniIndex::Utils::Utils::replace(jObj, ",", "\",\"");
        jObj = OmniIndex::Utils::Utils::replace(jObj, " {", "{");
        jObj = OmniIndex::Utils::Utils::replace(jObj, "}\",\"{", "},{");
        jObj = OmniIndex::Utils::Utils::replace(jObj, " [", "[");
        jObj = OmniIndex::Utils::Utils::replace(jObj, "]\",\"[", "],[");        
        std::vector<std::string> jArray;
        std::string tmpArray = jObj.substr(1);
        std::vector<std::string> schemaKeys;
        //We will see if we have a definition for the schema. If we do 
        //then we will make sure that our pattern follows it
        OmniIndex::Utils::Utils::toLower(schema);
        OmniIndex::Utils::Utils::toLower(key);
        size_t sz_pos = schema.find(" ." + key);
        if ( sz_pos != std::string::npos ) { 
            schema.erase ( 0, sz_pos ); 
            sz_pos = schema.find(");");
            if ( sz_pos != std::string::npos ) { 
                schema.erase ( sz_pos ); 
                sz_pos = schema.find("(");
                if ( sz_pos != std::string::npos ) { 
                    schema.erase ( 0, sz_pos +1 );
                    sz_pos = schema.find(" ");
                    while ( sz_pos != std::string::npos ) {
                        std::string tmp = schema.substr(0, sz_pos );
                        schema.erase(0, sz_pos +1 );
                        OmniIndex::Utils::Utils::trim(tmp);
                        schemaKeys.push_back(tmp);
                        sz_pos = schema.find(",");
                        if ( sz_pos != std::string::npos ) { schema.erase ( 0, sz_pos + 1 ); }
                         OmniIndex::Utils::Utils::trim(schema);
                        sz_pos = schema.find(" ");
                    }
                }                   
            }            
        }
        //iterate through. We may have 3 types of objects
        //string/numeric
        //json {}
        //array[]
        //So we need to look for each as we navigate through
        std::string value;
        while (tmpArray.length() > 0){
            value = "";
            size_t sz_comma = tmpArray.find(",");
            size_t sz_open_bracket = tmpArray.find("[");
            size_t sz_close_bracket = tmpArray.find("]");
            size_t sz_open_brace = tmpArray.find("{");
            size_t sz_close_brace= tmpArray.find("}");
            if ( sz_comma < sz_open_bracket && sz_comma < sz_open_brace ) {
                value = tmpArray.substr(0, sz_comma );
                if ( value.find("]") == std::string::npos && value.find("}") == std::string::npos ) {
                    //value = OmniIndex::Utils::Utils::replace(value, "\"", "");
                }
                OmniIndex::Utils::Utils::trim(value);
                value = OmniIndex::Utils::Utils::replace(value, "\"\"}", "\"}");
                jArray.push_back(value);
                tmpArray.erase(0, sz_comma +1);
                sz_comma = tmpArray.find(",");                      
            } else if ( sz_comma < sz_open_bracket && sz_comma > sz_open_brace ) {
                //for now we will keep this simple and retuen to it later
                sz_open_brace = tmpArray.find("{", sz_open_brace +1);
                sz_close_brace= tmpArray.find("},");
                while ( sz_open_brace > sz_close_brace ) {
                    value = tmpArray.substr(0, sz_open_brace - 1);
                    OmniIndex::Utils::Utils::trim(value);
                    size_t sz_position = 0;
                    size_t sz_previousPosition = 1;
                    std::string lwr = value;
                    OmniIndex::Utils::Utils::toLower(lwr);
                    for ( auto& key : schemaKeys ) {
                        sz_position = lwr.find(key);
                        if ( sz_position == std::string::npos ) {
                            if ( sz_previousPosition == 1 ) {
                                value.insert(sz_previousPosition, "\"" + key + "\":\"\",");
                            } else if (sz_previousPosition == value.find("}") -1) {
                                value.insert(sz_previousPosition, ", \"" + key + "\":\"\"");
                            } else  {
                                value.insert(sz_previousPosition, "\"" + key + "\":\"\",");
                            }
                            
                            sz_previousPosition = value.find(key);
                            sz_previousPosition = value.find("\",", sz_previousPosition);
                        } else {
                            sz_previousPosition = value.find(key);
                            sz_previousPosition = value.find(",", sz_previousPosition);
                            size_t sz_check = value.find("}");
                            if ( sz_previousPosition > sz_check ) {  sz_previousPosition = value.find("}") -1; }                          
                        }
                    }                    
                    size_t sz_end = value.find_last_of("]");
                    if ( sz_end != std::string::npos ) { value.erase ( sz_end ); }                 
                    if ( value.find("]") == std::string::npos && value.find("}") == std::string::npos ) {
                        //value = OmniIndex::Utils::Utils::replace(value, "\"", "");
                    } 
                    OmniIndex::Utils::Utils::trim(value);  
                    tmpArray.erase(0, sz_open_brace - 1);
                    sz_open_brace = tmpArray.find("{");
                    sz_close_brace= tmpArray.find("},"); 
                    sz_close_brace = value.find_last_of("},");
                    if ( sz_close_brace > value.length() -3 ) {
                        value.erase ( sz_close_brace +1, 1 );
                    } 
                    sz_close_brace = value.find_last_of("},");
                    if ( sz_close_brace > value.length() -3 ) {
                        value.erase ( sz_close_brace, 1 );
                    } 
                    if ( value.find("]") == std::string::npos && value.find("}") == std::string::npos ) {
                        //value = OmniIndex::Utils::Utils::replace(value, "\"", "");
                    } 
                    OmniIndex::Utils::Utils::trim(value);  
                    value = OmniIndex::Utils::Utils::replace(value, "\"\"}", "\"}");                                     
                    jArray.push_back(value);                                       
                }
                if ( tmpArray.find("},") == std::string::npos ) {
                    value = tmpArray;
                    tmpArray = "";
                    size_t sz_position = 0;
                    size_t sz_previousPosition = 1;
                    std::string lwr = value;
                    OmniIndex::Utils::Utils::toLower(lwr);
                    std::string prev_key;
                    for ( auto& key : schemaKeys ) {
                        OmniIndex::Utils::Utils::trim(value);
                        std::string lwr = value;
                        OmniIndex::Utils::Utils::toLower(lwr);
                        sz_position = lwr.find(key);
                        if ( sz_position == std::string::npos ) {
                            if ( sz_previousPosition == 1 ) {
                                value.insert(sz_previousPosition +1, "\"" + key + "\":null,");
                            } else if (sz_previousPosition == value.find_last_of("}")) {
                                value.insert(sz_previousPosition +1, ", \"" + key + "\":null");
                            } else if ( sz_previousPosition != std::string::npos)  {
                                value.insert(sz_previousPosition +1, ",\"" + key + "\":null");
                            } else {
                                sz_previousPosition = value.find_last_of("\"" + prev_key + "\":");
                                if ( sz_previousPosition != std::string::npos ) {
                                    sz_previousPosition = value.find(",", sz_previousPosition);
                                    if ( sz_previousPosition != std::string::npos ) {
                                        value.insert(sz_previousPosition, ",\"" + key + "\":null");
                                    } else {
                                        sz_previousPosition = value.find_last_of("}");
                                        if ( sz_previousPosition != std::string::npos ) {
                                            value.insert(sz_previousPosition, ",\"" + key + "\":null");
                                        }                                        
                                    }
                                }
                            }
                            
                            sz_previousPosition = value.find(key);
                            sz_previousPosition = value.find(",", sz_previousPosition);
                        } else {
                            sz_previousPosition = value.find(key);
                            sz_previousPosition = value.find(",", sz_previousPosition);
                            if ( sz_previousPosition == std::string::npos ) {
                                sz_previousPosition = value.find_last_of("}") -1;
                            }                            
                        }
                        prev_key = key;
                    }                
                    size_t sz_end = value.find_last_of("]");
                    if ( sz_end != std::string::npos ) { value.erase ( sz_end ); }                 
                    if ( value.find("]") == std::string::npos && value.find("}") == std::string::npos ) {
                        //value = OmniIndex::Utils::Utils::replace(value, "\"", "");
                    } 
                    OmniIndex::Utils::Utils::trim(value); 
                    value = OmniIndex::Utils::Utils::replace(value, "\"\"}", "\"}");                  
                    jArray.push_back(value);                       
                } else {
                    value += tmpArray;
                    tmpArray = "";
                    size_t sz_end = value.find_last_of("]");
                    if ( sz_end != std::string::npos ) { value.erase ( sz_end ); }                     
                     if ( value.find("]") == std::string::npos && value.find("}") == std::string::npos ) {
                       // value = OmniIndex::Utils::Utils::replace(value, "\"", "");
                    }
                    OmniIndex::Utils::Utils::trim(value);
                    value = OmniIndex::Utils::Utils::replace(value, "\"\"}", "\"}");
                    jArray.push_back(value);  
                }     
            } else if ( tmpArray.find(",") == std::string::npos && tmpArray.length() > 0  ) {
                value = tmpArray;
                size_t sz_end = value.find_last_of("]");
                if ( sz_end != std::string::npos ) { value.erase ( sz_end ); }
                if ( value.find("]") == std::string::npos && value.find("}") == std::string::npos ) {
                    //value = OmniIndex::Utils::Utils::replace(value, "\"", "");
                }
                OmniIndex::Utils::Utils::trim(value);
                std::string lwr = value;
                OmniIndex::Utils::Utils::toLower(lwr);
                value = OmniIndex::Utils::Utils::replace(value, "{", "");
                value = OmniIndex::Utils::Utils::replace(value, "}", "");
                std::string tmp_value = value;
                value = "";
                for ( auto& key : schemaKeys ) {
                    if ( lwr.find(key) == std::string::npos ) {
                        value += "\"" + key + "\":null,";
                    } else {                        
                        value += tmp_value + ","; 
                    }
                }
                value = OmniIndex::Utils::Utils::replace(value, "\"\"}", "\"}");
                value.erase ( value.find_last_of(",")); 
                value = "{"  + value + "}";
                jArray.push_back(value);
                tmpArray = "";                
            } else if (tmpArray.find("},") == std::string::npos ) {
                sz_close_bracket = tmpArray.find_last_of("]");
                if ( sz_close_bracket!= std::string::npos ) {
                    tmpArray.erase ( sz_close_bracket, 1 );
                    value = tmpArray;
                    if ( value.find("]") == std::string::npos && value.find("}") == std::string::npos ) {
                        //value = OmniIndex::Utils::Utils::replace(value, "\"", "");
                    }
                    OmniIndex::Utils::Utils::trim(value);
                    value = OmniIndex::Utils::Utils::replace(value, "\"\"}", "\"}");
                    jArray.push_back(value);
                    tmpArray = "";                     
                } else { /* BAD */ tmpArray = ""; }
            }
        }
        return jArray;         
    }

    private:
    std::vector<std::string> keys;
    std::vector<std::string> values;
    void getValues(std::string json) {
    //We will loop through storing the pairs
    json = OmniIndex::Utils::Utils::replace(json, ": ", ":");
    json = OmniIndex::Utils::Utils::replace(json, ":,", ": null,");
    json = OmniIndex::Utils::Utils::replace(json, ":\"\"", ": null");

    //Walk the tree
    OmniIndex::Utils::Utils::trim(json);
    size_t sz_tree = json.find("{");
    if ( sz_tree == 0 ) {
        json.erase ( 0, 1);
    }
    bool isOpen = true;
    std::string s_tree = json;
    sz_tree = 0;
    std::string tree_key, tree_value, s_tmp = "";
    while (sz_tree != std::string::npos ) {
        s_tmp = s_tree.substr(0, sz_tree + 1);
        s_tree.erase(0, sz_tree + 1);
        size_t sz_end = s_tree.find("}");
        if ( sz_end != std::string::npos ) {
            s_tmp += s_tree.substr(0, sz_end + 1);
            s_tree.erase(0, sz_end + 1);
        }
        size_t sz_open_count = 0;
        size_t sz_pos = 0;
        for ( sz_pos = s_tmp.find("{", sz_pos+1); sz_pos != std::string::npos; sz_pos = s_tmp.find("{", sz_pos+1) ) {
            ++sz_open_count;
        }
        size_t sz_close_count = 0;
        sz_pos = 0;
        for ( sz_pos = s_tmp.find("}", sz_pos+1); sz_pos != std::string::npos; sz_pos = s_tmp.find("}", sz_pos+1) ) {
            ++sz_close_count;
        } 
        while  ( sz_open_count > sz_close_count ) {
            sz_end = s_tree.find("}");
            if ( sz_end != std::string::npos ) {
                s_tmp += s_tree.substr(0, sz_end + 1);
                s_tree.erase(0, sz_end + 1);
            } 
            sz_open_count = 0;
            sz_pos = 0;
            for ( sz_pos = s_tmp.find("{", sz_pos+1); sz_pos != std::string::npos; sz_pos = s_tmp.find("{", sz_pos+1) ) {
                ++sz_open_count;
            }
            sz_close_count = 0;
            sz_pos = 0;
            for ( sz_pos = s_tmp.find("}", sz_pos+1); sz_pos != std::string::npos; sz_pos = s_tmp.find("}", sz_pos+1) ) {
                ++sz_close_count;
            }                        
        }
        sz_tree = s_tree.find("{");    
    }




    size_t sz_current_pos = -1;
    for ( size_t sz_find = json.find( ":" ); sz_find != std::string::npos; sz_find = json.find( ":" ) ) {
        ++sz_current_pos;
        std::string key, value;
        key = json.substr(0, sz_find);
        json.erase ( 0, sz_find + 1 );
        size_t sz_pos = key.find("\"");
        if ( key.length() <= 0 ) { 
            keys.clear();
            values.clear();
            break; 
        }
        key.erase ( 0, sz_pos + 1);
        sz_pos = key.find("\"");
        if ( key.length() <= 0  ) { 
            keys.clear();
            values.clear();
            break; 
        }
        if ( sz_pos != std::string::npos ) {
            key.erase (sz_pos);
        }
        sz_pos = key.find("{");
        if ( sz_pos != std::string::npos ) {
            key.erase (0, sz_pos +1);
        } 
        
        OmniIndex::Utils::Utils::trim(key);
        if ( key.length() <= 0 ) { 
            keys.clear();
            values.clear();
            break; 
        }         
        //Now the value
        OmniIndex::Utils::Utils::trim(json);
        size_t sz_comma =  json.find(",");
        size_t sz_brace =  json.find("{");
        size_t sz_square =  json.find("[");
        if ( sz_comma > sz_brace && sz_brace < sz_square ) { 
            if ( sz_brace == 0 ) {
                size_t sz_tree = json.find("{");
                bool isOpen = true;
                sz_tree = 0;
                std::string s_tmp = "";
                while (sz_tree != std::string::npos ) {
                    s_tmp = json.substr(0, sz_tree + 1);
                    json.erase(0, sz_tree + 1);
                    size_t sz_end = json.find("}");
                    if ( sz_end != std::string::npos ) {
                        s_tmp += json.substr(0, sz_end + 1);
                        json.erase(0, sz_end + 1);
                    }
                    size_t sz_open_count = 0;
                    size_t sz_pos = -1;
                    for ( sz_pos = s_tmp.find("{", sz_pos+1); sz_pos != std::string::npos; sz_pos = s_tmp.find("{", sz_pos+1) ) {
                        ++sz_open_count;
                    }
                    size_t sz_close_count = 0;
                    sz_pos = -1;
                    for ( sz_pos = s_tmp.find("}", sz_pos+1); sz_pos != std::string::npos; sz_pos = s_tmp.find("}", sz_pos+1) ) {
                        ++sz_close_count;
                    } 
                    while  ( sz_open_count > sz_close_count ) {
                        sz_end = json.find("}");
                        if ( sz_end != std::string::npos ) {
                            s_tmp += json.substr(0, sz_end + 1);
                            json.erase(0, sz_end + 1);
                        } 
                        sz_open_count = 0;
                        sz_pos = -1;
                        for ( sz_pos = s_tmp.find("{", sz_pos+1); sz_pos != std::string::npos; sz_pos = s_tmp.find("{", sz_pos+1) ) {
                            ++sz_open_count;
                        }
                        sz_close_count = 0;
                        sz_pos = -1;
                        for ( sz_pos = s_tmp.find("}", sz_pos+1); sz_pos != std::string::npos; sz_pos = s_tmp.find("}", sz_pos+1) ) {
                            ++sz_close_count;
                        }                        
                    }
                    value = s_tmp;
                    keys.push_back(key);
                    if ( value == "null" ) { value = '\0';}
                    if ( value.find("}") == value.size() -1 && value.find("}") != std::string::npos ) {
                        value.erase(value.size() -1, 1 );
                    }                     
                    values.push_back(value);
                    sz_tree = std::string::npos;    
                }
            } else {
                json.erase ( 0, sz_brace );
                sz_brace =  json.find("},");
                sz_pos = json.find("{", 1);
                while ( (sz_pos < sz_brace) && (sz_pos + 1  == sz_brace) ) {
                    sz_brace =  json.find("},", sz_brace + 1);
                    sz_pos = json.find("{", sz_pos + 1);                 
                }
                if ( sz_brace == std::string::npos ) { sz_brace =  json.find("}"); }
                if ( sz_brace != std::string::npos ) {
                    value = json.substr(0, sz_brace + 1);
                    json.erase(0, sz_brace + 1);
                    keys.push_back(key);
                    value = OmniIndex::Utils::Utils::replace(value, "\"", ""); 
                    if ( value == "null" ) { value = '\0';}  
                    if ( value.find("}") == value.size() -1 && value.find("}") != std::string::npos ) {
                        value.erase(value.size() -1, 1 );
                    }                                 
                    values.push_back(value);

                } else {
                    keys.clear();
                    values.clear();
                    break;                 
                }   
            }
        } else {
            sz_comma =  json.find(",");
            sz_brace =  json.find("[");
            if ( sz_comma > sz_brace ) { 
                json.erase ( 0, sz_brace );
                sz_brace =  json.find("],");
                sz_pos = json.find("[", 1);
                while ( (sz_pos < sz_brace) && (sz_pos + 1  == sz_brace) ) {
                    sz_brace =  json.find("],", sz_brace + 1);
                    sz_pos = json.find("[", sz_pos + 1);          
                }
                if ( sz_brace != std::string::npos ) {
                    value = json.substr(0, sz_brace + 1);
                    json.erase(0, sz_brace + 1);
                    keys.push_back(key);
                    value = OmniIndex::Utils::Utils::replace(value, "\"", "");
                    if ( value == "null" ) { value = '\0';} 
                    if ( value.find("}") == value.size() -1 && value.find("}") != std::string::npos ) {
                        value.erase(value.size() -1, 1 );
                    }                                       
                    values.push_back(value);
                } else if (json.find("[") == 0 ) {
                    sz_brace =  json.find("]");
                    if ( sz_brace == std::string::npos ) {
                        keys.clear();
                         values.clear();
                        break;                             
                    }
                    value = json.substr(0, sz_brace + 1);
                    json.erase(0, sz_brace + 1);
                    keys.push_back(key);
                    value = OmniIndex::Utils::Utils::replace(value, "\"", ""); 
                    if ( value == "null" ) { value = '\0';} 
                    if ( value.find("}") == value.size() -1 && value.find("}") != std::string::npos ) {
                        value.erase(value.size() -1, 1 );
                    }                                 
                    values.push_back(value);                
                } else {
                    keys.clear();
                    values.clear();
                    break;                 
                }
            } else {
                sz_comma =  json.find(",");
                if ( sz_comma != std::string::npos ) {
                    value = json.substr(0, sz_comma );
                    json.erase(0, sz_comma + 1);
                    OmniIndex::Utils::Utils::trim(value);
                    value = OmniIndex::Utils::Utils::replace(value, "\"", "");
                    keys.push_back(key);
                    if ( value == "null" ) { value = '\0';}
                    if ( value.find("}") == value.size() -1 && value.find("}") != std::string::npos ) {
                        value.erase(value.size() -1, 1 );
                    }                       
                    values.push_back(value);              
                }
            }                        
        }
        if ( key.length() > 0 && value.length() <= 0 ) {
            OmniIndex::Utils::Utils::trim(json);
            size_t sz_end = json.find_last_of("}");
            if ( sz_end != std::string::npos ) { json.erase ( sz_end ); }
            json = OmniIndex::Utils::Utils::replace(json, "\"", "");
            value = json;
            //if ( value.length() > 0 ) {
                keys.push_back(key);
                if ( value == "null" ) { value = '\0';}
                    if ( value.find("}") == value.size() -1 && value.find("}") != std::string::npos ) {
                        value.erase(value.size() -1, 1 );
                    }                   
                values.push_back(value);   
           // }              
        } 

    }
}
};
#endif