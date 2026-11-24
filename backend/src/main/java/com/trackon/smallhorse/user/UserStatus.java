package com.trackon.smallhorse.user;

public enum UserStatus {
    /** 정상 */
    ACTIVE,
    /** 탈퇴 (데이터 보존용 soft delete) */
    WITHDRAWN
}
