export type Routing = {
  domainStrategy: DomainStrategy;
  domainMatcher: DomainMatcher;
  rules: Rules[];
  balancers: Balancers[];
};

export type Rules = {
  domainMatcher: DomainMatcher;
  type: RulesType;
  inboundTag: string[];
  outboundTag: string;
  domain?: string[];
  ip?: string[];
  port?: string;
  sourcePort?: string;
  network?: RulesNetwork;
  source?: string[];
  user?: string[];
  protocol?: RulesProtocol[];
  attrs?: object;
  balancerTag?: string;
};

export type Balancers = {
  tag: string;
  selector: string[];
};

export type DomainStrategy = 'AsIs' | 'IPIfNonMatch' | 'IPOnDemand';
export type DomainMatcher = 'hybrid' | 'linear';
export type RulesType = 'field';
export type RulesNetwork = 'tcp' | 'udp' | 'tcp,udp';
export type RulesProtocol = 'http' | 'tls' | 'bittorrent';
