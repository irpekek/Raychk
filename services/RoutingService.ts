import {
  DomainMatcher,
  Routing,
  Rules,
  RulesNetwork,
  RulesProtocol,
  RulesType,
} from '../types/routing.type.d.ts';

export class RoutingService {
  protected _routing: Routing;

  constructor() {
    this._routing = {
      domainStrategy: 'AsIs',
      domainMatcher: 'hybrid',
      rules: [],
      balancers: [],
    };
  }

  public get routing(): Routing {
    return this._routing;
  }

  public get rules(): Rules[] {
    return this._routing.rules;
  }

  public clearRules() {
    this._routing.rules.length = 0;
  }

  public addRule(
    domainMatcher: DomainMatcher,
    type: RulesType,
    inboundTag: string[],
    outboundTag: string,
    domain?: string[],
    ip?: string[],
    port?: string,
    sourcePort?: string,
    network?: RulesNetwork,
    source?: string[],
    user?: string[],
    protocol?: RulesProtocol[],
    attrs?: object,
    balancerTag?: string,
  ) {
    this._routing.rules.push({
      domainMatcher,
      type,
      inboundTag,
      outboundTag,
      domain: domain || [],
      ip: ip || [],
      port: port || '53,80,443,1000-2000',
      sourcePort: sourcePort || '0-65535',
      network: network || 'tcp,udp',
      source: source || [],
      user: user || [],
      protocol: protocol || [],
      attrs: attrs || {},
      balancerTag: balancerTag || '',
    });
  }

  public pushRule(rules: Rules) {
    this._routing.rules.push(rules);
  }

  public createRule(
    domainMatcher: DomainMatcher,
    type: RulesType,
    inboundTag: string[],
    outboundTag: string,
    domain?: string[],
    ip?: string[],
    port?: string,
    sourcePort?: string,
    network?: RulesNetwork,
    source?: string[],
    user?: string[],
    protocol?: RulesProtocol[],
    attrs?: object,
    balancerTag?: string,
  ): Rules {
    return {
      domainMatcher,
      type,
      inboundTag,
      outboundTag,
      domain,
      ip,
      port,
      sourcePort,
      network,
      source,
      user,
      protocol,
      attrs,
      balancerTag,
    };
  }
}
