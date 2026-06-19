#ifndef HTTP_H
#define HTTP_H

#include <string>
#include <vector>

namespace OmniIndex
{
    class Http
    {
    public:
        /**!This method will translate the IP address to a geo specific region, using the
         * service frm RapidAPI
         * @param std::string holding the IP address
         * @return std::string
         */
        static std::string get_geo(std::string);

        /** This method will download a file and stoe it to teh tmp folder prior to opening it
         * @param std::sting - url
         * @param std::string - tmp file
         */
        int download(std::string file_url, std::string tmp_filename);

        /**
         * Method to send a text (SMS ) message to a user
         * @param std::string holding the url
         * @return std::string
         */
        std::string request(std::string);

        long Response_Code;

        static int upload(const std::string filename, const std::string url, const std::string path, std::string user);

    private:
        // static size_t payload_source(void *, size_t, size_t, void *);
        static size_t payload_source(void *, size_t, size_t, std::string *);
        static size_t write_data(void *ptr, size_t size, size_t nmemb, FILE *stream);
    };
}

#endif