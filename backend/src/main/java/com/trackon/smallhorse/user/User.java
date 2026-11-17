package com.trackon.smallhorse.user;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * 회원. 소셜 로그인 전용이라 비밀번호 컬럼은 없다.
 * 참고: 예측 기록, 포인트 내역, 알림, 체크리스트, 랭킹은 별도 테이블로 분리 예정.
 */
@Entity
@Table(
        name = "users", // "user" 는 PostgreSQL 예약어
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_users_provider_provider_id", columnNames = {"provider", "provider_id"}),
                @UniqueConstraint(name = "uk_users_nickname", columnNames = "nickname")
        })
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 소셜 제공자 (GOOGLE ...) */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Provider provider;

    /** 제공자 쪽 고유 ID. 구글은 OIDC 의 sub. 이메일은 바뀔 수 있어 식별자로 쓰지 않는다. */
    @Column(name = "provider_id", nullable = false, length = 100)
    private String providerId;

    @Column(nullable = false, length = 255)
    private String email;

    /** 소셜 계정의 이름 (구글 name) */
    @Column(length = 100)
    private String name;

    /** 서비스 닉네임 (랭킹 등에 노출). 최초 로그인 직후에는 null 이고, 직접 설정한다. */
    @Column(length = 30)
    private String nickname;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role = Role.USER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status = UserStatus.ACTIVE;

    /** 가상 포인트 현재 잔액. 변동 내역은 별도 point_history 테이블에 쌓을 예정. */
    @Column(name = "point_balance", nullable = false)
    private long pointBalance = 0L;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected User() {
        // JPA 용
    }

    public User(Provider provider, String providerId, String email, String name, String profileImageUrl) {
        this.provider = provider;
        this.providerId = providerId;
        this.email = email;
        this.name = name;
        this.profileImageUrl = profileImageUrl;
    }

    /** 로그인할 때마다 소셜 쪽 최신 정보로 갱신 */
    public void updateFromSocial(String email, String name, String profileImageUrl) {
        this.email = email;
        this.name = name;
        this.profileImageUrl = profileImageUrl;
        this.lastLoginAt = Instant.now();
    }

    public void changeNickname(String nickname) {
        this.nickname = nickname;
    }

    public Long getId() { return id; }
    public Provider getProvider() { return provider; }
    public String getProviderId() { return providerId; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public String getNickname() { return nickname; }
    public String getProfileImageUrl() { return profileImageUrl; }
    public Role getRole() { return role; }
    public UserStatus getStatus() { return status; }
    public long getPointBalance() { return pointBalance; }
    public Instant getLastLoginAt() { return lastLoginAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
