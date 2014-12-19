'use strict'

angular.module('ef.directives',[]).directive('ngCurrency', ['$filter', function ($filter) {
  return {
    require: 'ngModel',
    link: function (scope, element, attrs, ngModel) {

      ngModel.$formatters.unshift(function (a) {
        return $filter('currency')(ngModel.$modelValue/100)
      })
      
      ngModel.$parsers.push(function (viewValue) {
        return viewValue*100
      })
            
    }
  }
}])