/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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

import { common } from '@kit.AbilityKit';
import data_preferences from '@ohos.data.preferences';
import { HiLog } from './HiLog';

const TAG: string = 'StorageUtil';

export default class StorageUtil {
  private static mInstance: StorageUtil | null = null;
  private appContext: common.Context | null = null;

  private constructor(appContext: common.Context) {
    this.appContext = appContext;
  }

  public static getInstance(appContext: common.Context): StorageUtil {
    if (!StorageUtil.mInstance) {
      StorageUtil.mInstance = new StorageUtil(appContext);
    }
    return StorageUtil.mInstance;
  }

  async saveData(key: string, value: string, name: string): Promise<boolean> {
    if (!this.appContext) {
      HiLog.error(TAG, 'App context is null.');
      return false;
    }
    try {
      let preference = await data_preferences.getPreferences(this.appContext, name);
      if (!preference) {
        HiLog.error(TAG, 'Preference is null.');
        return false;
      }
      await preference.put(key, value);
      HiLog.debug(TAG, 'Preference put key-value success.');
      await preference.flush();
      HiLog.debug(TAG, 'Flush preference success.');
      await data_preferences.removePreferencesFromCache(this.appContext, name);
      HiLog.info(TAG, 'Save data success.');
      return true;
    } catch (err) {
      HiLog.error(TAG, `Save data failed: ${JSON.stringify(err)}`);
    }
    return false;
  }

  async getData(key: string, name: string): Promise<data_preferences.ValueType> {
    if (!this.appContext) {
      HiLog.error(TAG, 'App context is null.');
      return '';
    }
    try {
      let preference = await data_preferences.getPreferences(this.appContext, name);
      if (!preference) {
        HiLog.error(TAG, 'Preference is null.');
        return '';
      }
      let res = await preference.get(key, '');
      HiLog.debug(TAG, 'Preference get value success.');
      await data_preferences.removePreferencesFromCache(this.appContext, name);
      HiLog.info(TAG, 'Get data success.');
      return res;
    } catch (err) {
      HiLog.error(TAG, `Get data failed: ${JSON.stringify(err)}`);
    }
    return '';
  }

  async deleteData(key: string, name: string): Promise<void> {
    if (!this.appContext) {
      HiLog.error(TAG, 'App context is null.');
      return;
    }
    try {
      let preference = await data_preferences.getPreferences(this.appContext, name);
      if (!preference) {
        HiLog.error(TAG, 'Preference is null.');
        return;
      }
      await preference.delete(key);
      HiLog.debug(TAG, 'Preference delete key success.');
      await preference.flush();
      HiLog.debug(TAG, 'Flush preference success.');
      await data_preferences.removePreferencesFromCache(this.appContext, name);
    } catch (err) {
      HiLog.error(TAG, `Delete data failed: ${JSON.stringify(err)}`);
      return;
    }
    HiLog.info(TAG, 'Delete data success.');
  }

  public async deleteFile(fileName: string): Promise<void> {
    if (!this.appContext) {
      HiLog.error(TAG, 'App context is null.');
      return;
    }
    try {
      data_preferences.deletePreferences(this.appContext, fileName);
      HiLog.info(TAG, 'Delete preferences success.');
    } catch (err) {
      HiLog.error(TAG, `Delete file failed: ${JSON.stringify(err)}`);
    }
  }
}