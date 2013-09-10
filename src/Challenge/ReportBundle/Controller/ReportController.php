<?php

namespace Challenge\ReportBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Template;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;

class ReportController extends Controller {    
    
    private function readParams(Request $request) {
        
        $search_params = array();
        $search_params['country'] = $request->query->get('country');
        $search_params['product'] = $request->query->get('product');
        $search_params['startDate'] = $request->query->get('startDate');
        $search_params['endDate'] = $request->query->get('endDate');
        
        $sort_params = array();
        $sort_params['sort'] = $request->query->get('sidx', 'productId');
        $sort_params['direction'] = $request->query->get('sord', 'asc');
                
        $pager_params = array();
        $pager_params['page'] = $request->query->get('page', 1);
        $pager_params['chunk'] = $request->query->get('rows', 10);

        $misc_params = array();
        $misc_params['format'] = 'Y-m-d';
        $misc_params['jsformat'] = 'yyyy-mm-dd';
        
        $params = array_merge($search_params, $sort_params, $pager_params, $misc_params);
        
        return array(
            'search_params' => $search_params, 
            'sort_params' => $sort_params, 
            'pager_params' => $pager_params, 
            'misc_params' => $misc_params, 
            'params' => $params);
    }
    
    /**
     * @Route("/", name="report")
     * @Template()
     */
    public function reportAction(Request $request) {

        $reportService = $this->get('report_service');
        $options = $this->readParams($request);
        
        $dates = $reportService->getOrdersDateRange();
        
        $options['params']['action'] = 'report';
        $options['params']['dataAction'] = 'reportData';
        $options['params']['dates'] = $dates;
        
        return array(
            'search_params' => $options['search_params'], 
            'sort_params' => $options['sort_params'], 
            'pager_params' => $options['pager_params'], 
            'misc_params' => $options['misc_params'], 
            'params' => $options['params']);
    }

    /**
     * @Route("/reportData", name="reportData")
     * @Template()
     */
    public function reportDataAction(Request $request) {

        $reportService = $this->get('report_service');
    
        $options = $this->readParams($request);
        $params = $options['params'];
        
        $params['offset'] = abs($params['page'] - 1) * $params['chunk'];
        
        $search = $reportService->doSearch($params);
        
        $totalItems = $search['totalItems'];
        $list = $search['list'];

        $params['totalItems'] = $totalItems;
        $params['totalPages'] = round($totalItems / $params['chunk']);

        $data = array('total' => $params['totalPages'], 
            'page' => $params['page'], 
            'chunk' => $params['chunk'], 
            'sort' => $params['sort'], 
            'direction' => $params['direction'], 
            'records' => count($list), 
            'rows' => $list);
                
        return new JsonResponse($data);
    }

}
