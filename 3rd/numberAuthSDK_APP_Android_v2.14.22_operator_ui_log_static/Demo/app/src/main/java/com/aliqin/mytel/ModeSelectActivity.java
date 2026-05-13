package com.aliqin.mytel;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;

import com.aliqin.mytel.auth.PersonActivity;
import com.aliqin.mytel.uitls.PermissionUtils;

import static com.aliqin.mytel.Constant.LOGIN;
import static com.aliqin.mytel.Constant.LOGIN_DELAY;
import static com.aliqin.mytel.Constant.LOGIN_TYPE;


public class ModeSelectActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_select);
        if (Build.VERSION.SDK_INT >= 23) {
            PermissionUtils.checkAndRequestPermissions(this, 10001, Manifest.permission.WRITE_EXTERNAL_STORAGE,
                    Manifest.permission.READ_PHONE_STATE);
        }

        findViewById(R.id.auth).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(ModeSelectActivity.this, PersonActivity.class);
                startActivity(intent);
            }
        });

        findViewById(R.id.login).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(ModeSelectActivity.this, DisplayActivity.class);
                intent.putExtra(LOGIN_TYPE, LOGIN);
                startActivity(intent);
            }
        });

        findViewById(R.id.login_delay).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(ModeSelectActivity.this, DisplayActivity.class);
                intent.putExtra(LOGIN_TYPE, LOGIN_DELAY);
                startActivity(intent);
            }
        });
    }
}

