@echo off

IF NOT EXIST "node_modules" (
    echo node_modules folder not found. Running npm install...
    npm install
    pause
    cls
    node .
) ELSE (
    node .
)
