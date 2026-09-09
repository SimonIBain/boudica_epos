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

        /**! POST a JSON body via libcurl (not a shell-out — safe against
         * shell-injection from untrusted body/header content, unlike building a `curl ...`
         * command string and running it through popen()).
         * @param url - target URL
         * @param json_body - raw request body, Content-Type: application/json
         * @param extra_headers - additional header lines, e.g. "Authorization: Bearer ..."
         * @return response body (empty string on transport failure — check Response_Code)
         */
        std::string post_json(std::string url, std::string json_body, std::vector<std::string> extra_headers = {});

    private:
        // static size_t payload_source(void *, size_t, size_t, void *);
        static size_t payload_source(void *, size_t, size_t, std::string *);
        static size_t write_data(void *ptr, size_t size, size_t nmemb, FILE *stream);
    };
}

#endif