'use strict'

angular.module('ef.filters',[])

.filter("roleDictionary", function () {
  var dictionary = {
    "shopManager": "店长",
    "cashier": "收银员"
  }
  
  return function (key) {
    return dictionary[key];
  }
})

.filter("dateFormat", function () {
  return function (date, format) {
    format = format || 'YYYY-MM-DD HH:mm:ss'
    return moment.unix(date).format(format)
  }
})

.filter("dealTypeDictionary", function () {
  var dictionary = {
    "deal": "消费",
    "return": "退货退款",
    "withdraw": "提现",
    "writedown": "冲减",
    "prepay": "充值"
  }
  return function (key) {
    return dictionary[key] || '其他'
  }
})

.filter("billOwner", function () {
  return function (settlement) {
    var owner = '走入客户'
    if(settlement && settlement.payeeAccount) {
      owner = settlement.payeeAccount.name
    } else if(settlement && settlement.payerAccount) {
      owner = settlement.payerAccount.name
    }
    return owner
  }
})

.filter("statusDictionary", function () {
  var dictionary = {
    "sale": "上架",
    "desale": "下架",
    "removed": "已删除"
  }
  return function (key) {
    return dictionary[key] || '其他'
  }
})