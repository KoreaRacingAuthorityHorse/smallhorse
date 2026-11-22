package com.trackon.smallhorse.user;

/** 가입 경로. 카카오/네이버 추가 시 여기에 값만 추가. */
public enum Provider {
    /** 자체 가입 (provider_id = 로그인 ID, password_hash 사용) */
    LOCAL,
    GOOGLE
}
