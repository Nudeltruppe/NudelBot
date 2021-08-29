wget https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-1.2.0.tar.gz
tar -xvf libwebp-1.2.0.tar.gz
cd libwebp-1.2.0
./configure --prefix=$PWD/../node_modules/webp-converter/bin/libwebp_linux/ --disable-shared
make -j 4
make install
cd ..
rm -rfv libwebp-1.2.0*
mkdir node_modules/webp-converter/temp -p