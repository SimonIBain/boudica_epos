cmake_minimum_required(VERSION 3.10)
project(boudica_pos)

# Set C++ standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Add compiler flags for diagnostics
if(UNIX)
    add_compile_options(-fdiagnostics-color=always -g)
endif()

# Find required packages
find_package(PostgreSQL REQUIRED)
find_package(CURL REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(cryptopp QUIET)
if(NOT cryptopp_FOUND)
    # Fallback to manual linking if package not found
    set(CRYPTOPP_LIBS cryptopp)
else()
    set(CRYPTOPP_LIBS cryptopp::cryptopp)
endif()

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/src/includes)
include_directories(${PostgreSQL_INCLUDE_DIRS})
include_directories(${CURL_INCLUDE_DIRS})
include_directories(${OPENSSL_INCLUDE_DIR})

# Source files
set(SOURCES
    src/main.cpp
    src/base64pp.cpp
    src/cryptography.cpp
    src/http.cpp
    src/logging.cpp
    src/postgresbc.cpp
    src/stripe.cpp
    src/authentication.cpp
    src/utils.cpp
)

# Create executable
add_executable(boudica_pos ${SOURCES})

# Link libraries
target_link_libraries(boudica_pos
    ${PostgreSQL_LIBRARIES}
    ${CURL_LIBRARIES}
    ${OPENSSL_LIBRARIES}
    ${CRYPTOPP_LIBS}
    pthread
)

# Installation (optional)
install(TARGETS boudica_pos DESTINATION bin)
install(FILES src/boudica_pos.conf DESTINATION etc/boudica_pos)

# Output directory
set_target_properties(boudica_pos PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/src"
)
