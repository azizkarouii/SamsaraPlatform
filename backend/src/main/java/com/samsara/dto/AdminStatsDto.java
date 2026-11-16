package com.samsara.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * Figures of the whole platform for the superadmin. Until real subscriptions exist, every active account
 * is taken as paying the monthly price since the month it was created.
 */
@Data
@Builder
@AllArgsConstructor
public class AdminStatsDto {
    private long owners;
    private long activeOwners;
    private long samsars;
    private long activeSamsars;
    private long ownersWithSamsars;
    private long houses;
    private long reservations;
    private long newAccountsThisMonth;
    private BigDecimal monthlyPrice;
    /** Active accounts × monthly price. */
    private BigDecimal monthlyRevenue;
    /** Every started month of every active account, × monthly price. */
    private BigDecimal totalRevenue;
    private List<Month> months;

    /** Paying accounts at the end of a month and what they bring. */
    public record Month(String month, long accounts, BigDecimal revenue) {}
}
