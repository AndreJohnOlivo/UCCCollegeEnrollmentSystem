<?php
//inclusion of connectToDatabase.php

include 'connectToDatabase.php';

//DB CONNECTION
$conn = connectToDatabase();

//usage of $conn object for DB OPS
$sql = "SELECT * FROM studentRespository";
$result = $conn->query($sql);

if ($result-> num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo "Student Number: " . "Student Name: ". "Program: " . "Year Level: " . "<br>";
    }
} else { 
    echo "0 Results.";
}

$conn->close();
?>