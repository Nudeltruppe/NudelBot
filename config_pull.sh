read -p "config >> " config
wget $config -O config.zip

unzip config.zip
rm config.zip