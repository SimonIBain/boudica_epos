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

#ifndef CRYPTOGRAPHY_H
#define CRYPTOGRAPHY_H
#pragma once

#include <string>
#include <cryptopp/secblock.h>

    class Crypto {
        public:
            /**This method will take a plain input string and a key/password
             * and will create ciphered output
             * @param std::string plain string
             * @param std::string key/password
             * @return std::string ciphered data
             */ 
            static std::string encrypt(const std::string, const std::string);
            /**This method will take a ciphered input string and a key/password
             * and will create plain output
             * @param std::string cipherd string
             * @param std::string key/password
             * @return std::string plain data
             */ 
            static std::string decrypt(std::string, const std::string);
            /**This method will create a hash return of teh given string
             * @param std::string - to hash
             * @param const std::string password
             * @return std::string hash
             */ 

            static bool encryptFile(const std::string&, const std::string&, const std::string&);

            static bool decryptFile(const std::string&, const std::string&, const std::string&);

            static const char* string_create_id();
            static std::string createHash(const std::string, std::string);
            /** This will create searchable encrypted text from teh input data
             * @param const std::string text
             * @param std::string password
             * @return std::string
             */
            static std::string createSearchableText(std::string,  std::string);
           private:
            /** Here we will set the encryption key for the
             * crypto routines
             * @param std::string holding teh password to create a key from
            */ 
            static std::string setKey(const std::string);           
            static std::string setIV(const std::string);

    };
#endif