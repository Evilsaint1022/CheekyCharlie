#!/bin/bash

if [ ! -d "node_modules" ]; then
    echo "node_modules folder not found. Running npm install..."
    npm install
    read -p "Press enter to continue"
    clear
    node .
else
    node .
fi
