declare namespace WabBuilder {
  interface ProxyItem {
    sourceUrl: string;
    title?: string;
    premium?: boolean;
    consumeCredits?: boolean;
    useProxy?: boolean;
    proxyUrl?: string;
    proxyId?: string;
    appProxyManager?: any;
  }

  interface ProxyEventData {
    sourceUrl: string;
    proxyUrl?: string;
    proxyId?: string;
  }
}

declare module 'builder/plugins/attribute-config/AppProxyUtil' {
  class AppProxyUtil {
    static queryForSecureServicesInMap(webmapId: string): dojo.Deferred<WabBuilder.ProxyItem[]>;

    static isPremium(domain: string): boolean;

    static consumesCredits(domain: string): boolean;
  }
  export = AppProxyUtil;
}

declare module 'dojo/text!./res/mapitem.json' {
  let result: string;
  export = result;
}

declare module 'builder/plugins/attribute-config/MapProxyItem' {
  import CheckBox = require('jimu/dijit/CheckBox');

  class MapProxyItem{
    /**
     * Emitted event types
     */
    static PROXY_CREATED: string;
    static PROXY_DELETED: string;
    static PROCESS_START: string;
    static PROCESS_END: string;
    static PROCESS_ERROR: string;

    useProxyCheckBox: CheckBox;
    useProxy: boolean;
    sourceUrl: string;
    proxyId: string;
    proxyUrl: string;
    appProxyManager: any;
    nls: {};

    constructor(options: WabBuilder.ProxyItem);

    _onUseProxyChange(checked: boolean): void;
  }

  export = MapProxyItem;
}

declare module 'builder/plugins/attribute-config/UrlProxyItem' {
  class UrlProxyItem{
    /**
     * Emitted event types
     */
    static PROXY_DELETED: string;
    static PROCESS_END: string;
    static PROCESS_ERROR: string;

    sourceUrl: string;
    proxyId: string;
    proxyUrl: string;
    appProxyManager: any;
    nls: {};

    constructor(options: WabBuilder.ProxyItem);

    createProxy(): dojo.Deferred<any>;

    _deleteProxy(): void;
  }

  export = UrlProxyItem;
}
