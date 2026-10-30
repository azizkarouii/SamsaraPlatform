package com.samsara.service;

public final class PhoneUtils {

    private PhoneUtils() {
    }

    /** Keeps only the national digits: "+216 12 345 678", "0021612345678" and "12345678" are equal. */
    public static String normalize(String phone) {
        if (phone == null) {
            return null;
        }
        String digits = phone.replaceAll("\\D", "");
        if (digits.startsWith("00216")) {
            digits = digits.substring(5);
        } else if (digits.startsWith("216") && digits.length() > 8) {
            digits = digits.substring(3);
        }
        return digits.isEmpty() ? null : digits;
    }
}
