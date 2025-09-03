// src/main/java/com/example/springbootapp/util/PasswordEncoderUtility.java
package com.example.springbootapp.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Utility class to generate BCrypt encoded passwords
 * Run this as a main method to generate encoded passwords for your data.sql
 */
public class PasswordEncoderUtility {

    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        // Generate encoded passwords
        System.out.println("admin123 -> " + encoder.encode("admin123"));
        System.out.println("user123 -> " + encoder.encode("user123"));
        System.out.println("test123 -> " + encoder.encode("test123"));
        System.out.println("password123 -> " + encoder.encode("password123"));

        // Test encoding
        String plainPassword = "admin123";
        String encodedPassword = encoder.encode(plainPassword);
        System.out.println("\nTest encoding:");
        System.out.println("Plain: " + plainPassword);
        System.out.println("Encoded: " + encodedPassword);
        System.out.println("Matches: " + encoder.matches(plainPassword, encodedPassword));
    }
}