#include "includes/http.h"
#include "includes/utils.h"

#include <string.h>
#include <fstream>
#include "curl/curl.h"
#include "curl/easy.h"


using namespace OmniIndex;

struct upload_status
{
    int lines_read;
};

static const char *payload_text[12];

size_t Http::payload_source(void *contents, size_t size, size_t nmemb, std::string *s)
{
    size_t newLength = size * nmemb;
    try
    {
        s->append((char *)contents, newLength);
    }
    catch (std::bad_alloc &e)
    {
        // handle memory problem
        return 0;
    }
    return newLength;
}

size_t Http::write_data(void *ptr, size_t size, size_t nmemb, FILE *stream)
{
    size_t written = fwrite(ptr, size, nmemb, stream);
    return written;
}

std::string Http::get_geo(std::string ip)
{
    CURL *curl;
    CURLcode res;
    curl_global_init(CURL_GLOBAL_DEFAULT);
    curl = curl_easy_init();
    std::string geo_data;
    if (curl)
    {

        std::string curl_url = "https://telize-v1.p.rapidapi.com/location/" + ip + "?callback=getlocation";
        curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "GET");
        curl_easy_setopt(curl, CURLOPT_URL, curl_url.c_str());
        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, "x-rapidapi-host: telize-v1.p.rapidapi.com");
        headers = curl_slist_append(headers, "x-rapidapi-key: 0ca2e3b379mshf6359879c667801p1d06f3jsn6bea675d47bf");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L); // only for https
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L); // only for https
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, payload_source);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &geo_data);
#ifdef _DEBUG1
        curl_easy_setopt(curl, CURLOPT_VERBOSE, 1L); // remove this to disable verbose output
#endif

        /* Perform the request, res will get the return code */
        res = curl_easy_perform(curl);

        /* Check for errors */
        if (res != CURLE_OK)
        {
#ifdef _DEBUG1
            fprintf(stderr, "curl_easy_perform() failed: %s\n",
                    curl_easy_strerror(res));
#endif
        }

        /* always cleanup */
        curl_easy_cleanup(curl);
    }
    return geo_data;
}

int Http::download(std::string file_url, std::string tmp_filename)
{
    CURL *curl;
    FILE *fp;
    CURLcode res;
    curl = curl_easy_init();
    if (curl)
    {
#ifdef _WIN32
        fopen_s(&fp, tmp_filename.c_str(), "wb");
#else
       fp = fopen(tmp_filename.c_str(), "wb");
#endif
        
        curl_easy_setopt(curl, CURLOPT_URL, file_url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_data);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, fp);
        res = curl_easy_perform(curl);
        /* always cleanup */
        curl_easy_cleanup(curl);
        fclose(fp);
    }
    return 0;
}

std::string Http::request(std::string url)
{
    CURL *curl;
    CURLcode res;
    curl_global_init(CURL_GLOBAL_DEFAULT);
    curl = curl_easy_init();
    std::string response;
    if (curl)
    {

        std::string curl_url = url;
        curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "POST");
        curl_easy_setopt(curl, CURLOPT_URL, curl_url.c_str());
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L); // only for https
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L); // only for https
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, payload_source);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
#ifdef _DEBUG1
        curl_easy_setopt(curl, CURLOPT_VERBOSE, 1L); // remove this to disable verbose output
#endif

        /* Perform the request, res will get the return code */
        res = curl_easy_perform(curl);

        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &Response_Code);
        /* Check for errors */
        if (res != CURLE_OK)
        {
#ifdef _DEBUG1
            fprintf(stderr, "curl_easy_perform() failed: %s\n",
                    curl_easy_strerror(res));
#endif
        }

        /* always cleanup */
        curl_easy_cleanup(curl);
    }

    return response;
}

int Http::upload(const std::string filename, const std::string url
    , const std::string path, std::string user)
{

    std::string full_path = filename;
    std::string name;
    size_t sz_path = full_path.find_last_of("/");
    if (sz_path != std::string::npos)
    {
        name = full_path.substr(sz_path + 1);
    }
    CURL *curl;
    CURLcode res;

    curl_mime *form = NULL;
    curl_mimepart *field = NULL;
    struct curl_slist *headerlist = NULL;
    static const char buf[] = "Expect:";

    curl_global_init(CURL_GLOBAL_ALL);

    curl = curl_easy_init();
    if (curl)
    {
        /* Create the form */
        form = curl_mime_init(curl);

        /* Fill in the file upload field */
        field = curl_mime_addpart(form);
        curl_mime_name(field, "filename");
        curl_mime_filedata(field, full_path.c_str());
            //    /* Fill in the filename field */
        field = curl_mime_addpart(form);
        curl_mime_name(field, "path");
        curl_mime_data(field, path.c_str(), CURL_ZERO_TERMINATED);

    //    /* Fill in the uaer field */
        field = curl_mime_addpart(form);
       curl_mime_name(field, "username");
        curl_mime_data(field, user.c_str(), CURL_ZERO_TERMINATED);

    //    /* Fill in the submit field too, even if this is rarely needed */
        field = curl_mime_addpart(form);
        curl_mime_name(field, "submit");
        curl_mime_data(field, "send", CURL_ZERO_TERMINATED);

    //    /* initialize custom header list (stating that Expect: 100-continue is not
    //       wanted */
        headerlist = curl_slist_append(headerlist, buf);
        /* what URL that receives this POST */
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        // if ((argc == 2) && (!strcmp(argv[1], "noexpectheader")))
        /* only disable 100-continue header if explicitly requested */
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headerlist);
        curl_easy_setopt(curl, CURLOPT_MIMEPOST, form);
         /* Perform the request, res gets the return code */
        res = curl_easy_perform(curl);
        /* Check for errors */
        if (res != CURLE_OK)
            fprintf(stderr, "curl_easy_perform() failed: %s\n",
                    curl_easy_strerror(res));

    //    /* always cleanup */
        curl_easy_cleanup(curl);

    //    /* then cleanup the form */
        curl_mime_free(form);
    //    /* free slist */
        curl_slist_free_all(headerlist);
    }


    return 0;
}