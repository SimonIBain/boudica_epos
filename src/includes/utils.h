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

#ifndef UTILS_H
#define UTILS_H
#pragma once

#include <string>
#include <vector>

namespace OmniIndex::Utils {
    class Utils {
        public:
        /*! This method will trim a string to its right. Removing trailing white space
        * @param std::string pointer to the string to be trimmed
        * @return void
        */ 
        static void rtrim(std::string&);
        /*! This method will trim a string to its left. Removing leading white space
        * @param std::string pointer to the string to be trimmed
        * @return void
        */             
        static void ltrim(std::string&);
        /*! This method will trim a string. Removing trailing and leading white space
        * @param std::string pointer to the string to be trimmed
        * @return void
        */             
        static void trim(std::string&);
        /*! This method will replace all occurances of a string within a string
        * @param std::string pointer holding the string to replacxe in
        * @param std::string value to be replaced
        * @param std::string value to replace with
        * @return void
        */ 
        static std::string replace(std::string&, std::string, std::string);
        /*! This method will split a string at the given point
        * @param std::string pointer holding the string to split
        * @param std::string value split at
        * @return std::vector<std::string>
        */ 
        static std::vector<std::string> split(std::string, const std::string);
        /*! Method to make alower case all 'ASCII' characters within a string
        * @param std::string to lowercase
        * @return void
        */ 
        static void toLower(std::string&); 
        /*! This method will append a string to the end of a file
        * creating a new file if the file does not exists
        * @param const std::string filename
        * @param const std::string string to append
        * @return int
        */
        static int append(const std::string, const std::string); 

        static bool getTime(long); 
        
        static bool timeComparison(std::string, std::string);

        static std::string getCurrentUTCTime();

        static std::string deleteControls ( std::string startstring );

        static std::string get_uuid();

        static std::string create_ean_code();

        static bool file_exists(const std::string);

        static std::string file_open(const std::string);

        static std::string uuDecode(std::string);

        static std::string stripNonAlphaNumeric (std::string);

        static bool isAlphaNumeric(char ch);

        static bool is_predicate(char);

        static std::string normalize(std::string);

        static std::string get_key(const std::string&, const std::string&);

        static std::vector<std::vector<std::string> > get_configuration();

        static std::string exec(const std::string);
    };
}

#endif