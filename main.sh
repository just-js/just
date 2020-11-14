xxd -i just.js > main.h
sed -i 's/unsigned char/static const char/g' main.h
sed -i 's/unsigned int/static unsigned int/g' main.h
sed -i 's/examples_//g' main.h
