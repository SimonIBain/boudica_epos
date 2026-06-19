#include <cryptopp/cryptlib.h>
#include <cryptopp/rijndael.h>
#include <cryptopp/modes.h>
#include <cryptopp/files.h>
#include <cryptopp/osrng.h>
#include <cryptopp/hex.h>

#include "includes/cryptography.h"
#include "includes/string.hpp"
#include "includes/utils.h"

#include <iostream>
#include <string>
#include <vector>

#include <string.h>


const char* Crypto::string_create_id() {
    std::srand(std::time(nullptr)); // use current time as seed for random generator
    std::string data = "";
    int dice_roll = 32000;
    for (int roll=0; roll != dice_roll; ++roll) {
        int value = rand();
        while(value > dice_roll) {
            value = 1 + std::rand()/((RAND_MAX + 1u)/dice_roll);  // Note: 1+rand()%6 is biased
        }
        //try to remove biases
        int n = dice_roll - value + 1;
        int remainder = RAND_MAX % n;
        do{
            value = rand();
        }while (value >= RAND_MAX - remainder);
        data += std::to_string( 1 + value % n);
    }        
    while ( data.length() > 63 ) {
        data.erase(0,1);
    }
    //data = macaron::Encode(data);

    char* ret = (char *) malloc( data.size()+1 );
    strcpy(ret, (char*)data.c_str()); 
    return ret;        
}

std::string Crypto::createHash(std::string data, std::string password  ) {
    if ( ! OmniIndex::Utils::Utils::file_exists("/opt/kensai") ) {
        OmniIndex::Utils::Utils::exec("cp -p /opt/kensai");
        std::string env = "-out /opt/kensai/kensai_derivation 2048";
        const char* ch_key = string_create_id();
        std::string s_key(ch_key);
        std::string s_pass = "-passout pass:" + s_key;
        char temp[512];
        sprintf(temp, "openssl genrsa -%s -%s -%s", "-aes256", s_pass.c_str(), env.c_str());
        int ret = system((char *)temp);   
        password = OmniIndex::Utils::Utils::file_open("/opt/kensai/kensai_derivation");       
    }
    CryptoPP::SHA256 hash;
    std::string digest, run_data = password + data + password;
    int cycles = 1000;
    int current = 0;
    while ( current < cycles ) {
        CryptoPP::StringSource s(run_data, true, new CryptoPP::HashFilter(hash, new CryptoPP::HexEncoder(new CryptoPP::StringSink(digest))));
        if ( digest.length() <= 0 ) {
            digest = "";
        } 
        run_data = digest;
        if ( run_data.length() > 9 ) {
            std::string front = run_data.substr(0, 4);
            run_data.erase(0, 3);
            std::string back = run_data.substr(run_data.length() -4, 4);
            run_data.erase ( run_data.length() -4, 3);
            run_data += front;
            run_data = back + run_data;
        }
        ++current;
    }      
    return run_data;
}


std::string Crypto::encrypt(const std::string plain, const std::string password) {
    //get teh key and iv
    std::string tmp = setKey(password);
    CryptoPP::SecByteBlock key(reinterpret_cast<const typename CryptoPP::byte*>(&tmp[0]), tmp.size());
    tmp = setIV(password);
    CryptoPP::SecByteBlock iv(reinterpret_cast<const typename CryptoPP::byte*>(&tmp[0]), tmp.size());
    CryptoPP::AutoSeededRandomPool prng;

    std::string cipher;
    try  {
        CryptoPP::CBC_Mode< CryptoPP::AES >::Encryption e;
        e.SetKeyWithIV(key, key.size(), iv);

        CryptoPP::StringSource s(plain, true, 
            new CryptoPP::StreamTransformationFilter(e,
                new CryptoPP::StringSink(cipher)
            ) // StreamTransformationFilter
        ); // StringSource
    }
    catch(const CryptoPP::Exception& e) {
        return "";
    }
    std::string hash;
    CryptoPP::StringSource ssk(cipher, true /*pump all*/,
        new CryptoPP::HexEncoder(
            new CryptoPP::StringSink(hash)
        ) // HexDecoder
    ); // StringSource
    //Crypto::decrypt(hash, password);
    if ( hash.length() <= 0 ) {
        hash = "";
    }       
    return hash;    
}

std::string Crypto::decrypt(const std::string ciphered, const std::string password) {
    //Decode the hex
    std::string tmpa = ciphered;
    std::string decoded;
    CryptoPP::StringSource ssk(ciphered, true /*pump all*/,
        new CryptoPP::HexDecoder(
            new CryptoPP::StringSink(decoded)
        ) // HexDecoder
    ); // StringSource


    std::string plain;
    //get teh key and iv
    std::string tmp = setKey(password);
    CryptoPP::SecByteBlock key(reinterpret_cast<const CryptoPP::byte*>(&tmp[0]), tmp.size());
    tmp = setIV(password);
    CryptoPP::SecByteBlock iv(reinterpret_cast<const CryptoPP::byte*>(&tmp[0]), tmp.size());
    try  {
        CryptoPP::CBC_Mode< CryptoPP::AES >::Decryption e;
        e.SetKeyWithIV(key, key.size(), iv);

        CryptoPP::StringSource s(decoded, true, 
            new CryptoPP::StreamTransformationFilter(e,
                new CryptoPP::StringSink(plain)
            ) // StreamTransformationFilter
        ); // StringSource
    }
    catch(const CryptoPP::Exception& e) {
        return "";
    }
    if ( plain.length() <= 0 ) {
        plain = "";
    }       
    return plain;
}


std::string Crypto::setIV(const std::string password) {
    std::string iv = password;
    //Now get it to the correct size
    int pos = 0;
    while ( iv.length() > 16 ) {
        if ( iv.length()%2 == 0){
            iv.erase ( 0, 1 );
        } else {
            iv.erase ( iv.length() -1, 1 );
        }
    }
    while ( iv.length() < 16 ) {
        if ( iv.length()%2 == 0){
            iv += iv.substr(0, 1);
        } else {
            iv += iv.substr(iv.length() -1, 1);
        }
    } 
    if ( iv.length() <= 0 ) {
        iv = "";
    }          
    return iv;
}

std::string Crypto::setKey(const std::string password) {
    std::string key = password;
    //Now get it to the correct size
    int pos = 0;
    while ( key.length() > 32 ) {
        if ( key.length()%2 == 0){
            key.erase ( key.length() -1, 1 );
        } else {
            key.erase ( 0, 1 );
        }
    }
    while ( key.length() < 32 ) {
        if ( key.length()%2 == 0){
            key += key.substr(0, 1);
        } else {
            key += key.substr(0, 1);
        }
    } 
    if ( key.length() <= 0 ) {
        key = "";
    }        
    return key;
}

std::string Crypto::createSearchableText(const std::string plain, const std::string password) {
    oidx::string data (plain.c_str());
    data.toLower();
    std::vector<oidx::string> inData;
    while ( data.length() > 3 ) {
        inData.push_back(data.substr(0, 3));
        data.erase ( 0,1 );
    }
    inData.push_back(data.substr(0));
    //now encrypt each pairing
    std::string ciphered = "";
    for ( size_t itr = 0; itr < inData.size(); itr++ ) {
        int one = inData[itr][0];
        int two = inData[itr][1];
        std::string in = std::to_string(one + two);
        in = Crypto::encrypt(in, password);
        int cur = 0;
        for ( size_t it = 0; it < in.length(); it++ ) {
            cur = cur + in[it]; 
        }
        ciphered += std::to_string(cur);
    }
    if ( ciphered.length() <= 0 ) {
        ciphered = "";
    }       
    return ciphered;   
}

bool Crypto::encryptFile(const std::string &input, const std::string &output, const std::string &password)
{
    
    std::string tmp = setKey(password);
    CryptoPP::SecByteBlock key(reinterpret_cast<const typename CryptoPP::byte*>(&tmp[0]), tmp.size());
    tmp = setIV(password);
    CryptoPP::SecByteBlock iv(reinterpret_cast<const typename CryptoPP::byte*>(&tmp[0]), tmp.size());
    CryptoPP::AutoSeededRandomPool prng;   
    CryptoPP::CBC_Mode< CryptoPP::AES >::Encryption e;
    e.SetKeyWithIV(key, key.size(), iv);    
    
    std::ifstream in{input, std::ios::binary};
    std::ofstream out{output, std::ios::binary};
    try
    {
        CryptoPP::FileSource(input.c_str(), true,
            new CryptoPP::StreamTransformationFilter(
                e, new CryptoPP::FileSink(output.c_str())
            )
        );
        return true;
    }
    catch(const CryptoPP::Exception& e) {
        return false;
    }
}

bool Crypto::decryptFile(const std::string &input, const std::string &output, const std::string &password)
{
    
    std::string tmp = setKey(password);
    CryptoPP::SecByteBlock key(reinterpret_cast<const typename CryptoPP::byte*>(&tmp[0]), tmp.size());
    tmp = setIV(password);
    CryptoPP::SecByteBlock iv(reinterpret_cast<const typename CryptoPP::byte*>(&tmp[0]), tmp.size());
    CryptoPP::AutoSeededRandomPool prng;   
    CryptoPP::CBC_Mode< CryptoPP::AES >::Decryption e;
    e.SetKeyWithIV(key, key.size(), iv);    
    
    std::ifstream in{input, std::ios::binary};
    std::ofstream out{output, std::ios::binary};
    try
    {
        CryptoPP::FileSource(input.c_str(), true,
            new CryptoPP::StreamTransformationFilter(
                e, new CryptoPP::FileSink(output.c_str())
            )
        );
        return true;
    }
    catch(const CryptoPP::Exception& e) {
        return false;
    }
}
