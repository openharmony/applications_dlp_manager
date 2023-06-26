/*
 * Copyright (c) 2023 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import UIAbility from '@ohos.app.ability.UIAbility';
import datafile from '@ohos.file.fileAccess';
import abilityAccessCtrl from '@ohos.abilityAccessCtrl';
import type { Permissions } from '@ohos.abilityAccessCtrl';
import dlpPermission from '@ohos.dlpPermission';
import Constants from '../common/constant';
// @ts-ignore
import { getAuthPerm, checkAccountLogin, getOsAccountInfo, judgeIsSandBox, getFileFd } from '../common/utils';
import deviceInfo from '@ohos.deviceInfo';

const PHONE = 'phone';
const TAG = '[DLPManager_Main]';
let permissionList: Array<Permissions> = [
  'ohos.permission.READ_MEDIA',
  'ohos.permission.WRITE_MEDIA',
  'ohos.permission.FILE_ACCESS_MANAGER'
];

export default class MainAbility extends UIAbility {
  dlpFile: dlpPermission.DLPFile = null;
  authPerm: dlpPermission.DLPFileAccess = dlpPermission.DLPFileAccess.READ_ONLY;

  async onCreate(want, launchParam): Promise<void> {
    console.info(TAG, 'onCreate');
    globalThis.abilityWant = want;
    globalThis.context = this.context;
    globalThis.domainAccount = deviceInfo.deviceType === PHONE ? false : true;
    if (globalThis.domainAccount) {
      globalThis.uri = <string> globalThis.abilityWant.parameters.uri;
    } else {
      globalThis.uri = <string> globalThis.abilityWant.uri;
    }
    globalThis.dsHelper = await datafile.createFileAccessHelper(globalThis.context);
  }

  onDestroy(): void {
    console.info(TAG, 'onDestroy');
  }

  async showErrorDialogAndExit(error): Promise<void> {
    globalThis.abilityWant.parameters.error = error;
    globalThis.windowStage.setUIContent(globalThis.context, 'pages/alert', null);
  }

  async gotoSandbox(windowStage, accountInfo): Promise<void> {
    const linkFileName = globalThis.abilityWant.parameters.linkFileName.name;
    for (let key in globalThis.sandbox2linkFile) {
      for (let j in globalThis.sandbox2linkFile[key]) {
        if (globalThis.sandbox2linkFile[key][j][Constants.FILE_OPEN_HISTORY_TWO] === linkFileName) {
          let linkFile = globalThis.sandbox2linkFile[key][j];
          this.dlpFile = linkFile[Constants.FILE_OPEN_HISTORY_ONE];
        }
      }
    }
    if (globalThis.domainAccount) {
      this.authPerm = getAuthPerm(accountInfo.domainInfo.accountName, this.dlpFile.dlpProperty);
    } else {
      this.authPerm = getAuthPerm(accountInfo.distributedInfo.name, this.dlpFile.dlpProperty);
    }
    console.info(TAG, 'authPerm', JSON.stringify(this.authPerm));
    AppStorage.SetOrCreate('authPerm', this.authPerm);
    AppStorage.SetOrCreate('contractAccount', this.dlpFile.dlpProperty.contractAccount);
    if (this.authPerm < dlpPermission.DLPFileAccess.READ_ONLY ||
      this.authPerm > dlpPermission.DLPFileAccess.FULL_CONTROL) {
      await this.showErrorDialogAndExit({ code: Constants.ERR_JS_APP_INSIDE_ERROR });
      return;
    }
    if (this.authPerm === dlpPermission.DLPFileAccess.FULL_CONTROL) {
      windowStage.setUIContent(this.context, 'pages/changeEncryption', null);
    } else {
      windowStage.setUIContent(this.context, 'pages/permissionStatus', null);
    }
    windowStage.getMainWindow().then((win) => {
      win.setBackgroundColor('#00FFFFFF');
    });
  }

  async goContentPage(windowStage, srcFd, accountInfo): Promise<void> {
    try {
      console.info(TAG, 'openDLPFile', srcFd);
      this.dlpFile = await dlpPermission.openDLPFile(srcFd);
    } catch (err) {
      console.error(TAG, 'openDLPFile', srcFd, 'failed', err.code, err.message);
      await this.showErrorDialogAndExit(err);
      return;
    }
    if (globalThis.domainAccount) {
      this.authPerm = getAuthPerm(accountInfo.domainInfo.accountName, this.dlpFile.dlpProperty);
    } else {
      this.authPerm = getAuthPerm(accountInfo.distributedInfo.name, this.dlpFile.dlpProperty);
    }
    console.info(TAG, 'authPerm', JSON.stringify(this.authPerm));
    AppStorage.SetOrCreate('authPerm', this.authPerm);
    AppStorage.SetOrCreate('contractAccount', this.dlpFile.dlpProperty.contractAccount);
    if (this.authPerm < dlpPermission.DLPFileAccess.READ_ONLY ||
      this.authPerm > dlpPermission.DLPFileAccess.FULL_CONTROL) {
      await this.showErrorDialogAndExit({ code: Constants.ERR_JS_APP_INSIDE_ERROR });
      return;
    }
    if (this.authPerm === dlpPermission.DLPFileAccess.FULL_CONTROL) {
      windowStage.setUIContent(this.context, 'pages/changeEncryption', null);
    } else {
      windowStage.setUIContent(this.context, 'pages/permissionStatus', null);
    }
    windowStage.getMainWindow().then((win) => {
      win.setBackgroundColor('#00FFFFFF');
    });
  }

  checkValidWant(): boolean {
    if (globalThis.abilityWant.parameters === undefined) {
      console.error(TAG, 'need parameters in want');
      return false;
    }
    if (globalThis.abilityWant.parameters.fileName === undefined) {
      console.error(TAG, 'need fileName in want.parameters');
      return false;
    }
    if (globalThis.abilityWant.parameters.fileName.name === undefined) {
      console.error(TAG, 'need name in want.parameters.fileName');
      return false;
    }
    if (globalThis.uri === undefined) {
      console.error(TAG, 'need uri in want.parameters');
      return false;
    }
    return true;
  }

  async onWindowStageCreate(windowStage): Promise<void> {
    console.info(TAG, 'onWindowStageCreate');
    globalThis.windowStage = windowStage;
    try {
      let atManager = abilityAccessCtrl.createAtManager();
      await atManager.requestPermissionsFromUser(globalThis.context, permissionList);
    } catch (err) {
      console.error(TAG, 'requestPermissionsFromUser failed', err.code, err.message);
      return;
    }
    if (!this.checkValidWant()) {
      await this.showErrorDialogAndExit({ code: Constants.ERR_JS_APP_PARAM_ERROR });
      return;
    }
    let accountInfo;
    try {
      accountInfo = await getOsAccountInfo();
    } catch (err) {
      console.error(TAG, 'getOsAccountInfo failed', err.code, err.message);
      await this.showErrorDialogAndExit({ code: Constants.ERR_JS_GET_ACCOUNT_ERROR });
      return;
    }
    if (!checkAccountLogin(accountInfo)) {
      await this.showErrorDialogAndExit({ code: Constants.ERR_JS_APP_NO_ACCOUNT_ERROR });
      return;
    }
    let requestIsFromSandBox = await judgeIsSandBox();
    console.info(TAG, 'judgeIsSandBox', requestIsFromSandBox);
    if (requestIsFromSandBox) {
      this.gotoSandbox(windowStage, accountInfo);
      return;
    } else {
      let fileName = globalThis.abilityWant.parameters.fileName.name;
      let isDlpSuffix: boolean = fileName.endsWith('.dlp');
      if (!isDlpSuffix) {
        console.info(TAG, 'input file is not a dlp file');
        windowStage.setUIContent(this.context, 'pages/encryptionProtection', null);
        windowStage.getMainWindow().then((win) => {
          win.setBackgroundColor('#00FFFFFF');
        });
      } else {
        let uri = globalThis.uri;
        let srcFd = getFileFd(uri);
        this.goContentPage(windowStage, srcFd, accountInfo);
      }
    }
  }

  onWindowStageDestroy(): void {
    console.info(TAG, 'onWindowStageDestroy');
  }

  onForeground(): void {
    console.info(TAG, 'onForeground');
  }

  onBackground() {
    console.info(TAG, 'onBackground');
  }
};
