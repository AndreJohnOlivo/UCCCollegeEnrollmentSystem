<?php
// dbConnection.php

function connectToDatabase() {
    $host = 'localhost';
    $username = 'root';
    $password = 'ucccollegedept2024';
    $database = 'UCCCollegeEnrollment';

    //Create conn
    $conn = new mysqli($host, $username, $password, $database);

    //Connection check
    if ($conn->connect_error) {
        die("Connection Failed: ". $conn->connect_error);
    }

    return $conn;
}
?>