<?php

namespace Challenge\ReportBundle\Controller;

use DateTime;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Template;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;

class DefaultController extends Controller {

    private function getParam($params, $name, $default = null) {

        if (array_key_exists($name, $params)) {
            $value = trim($params[$name]);
            if (!empty($value)) {
                return $value;
            }
        }

        return $default;
    }

    private function buildQueryConditions($params) {

        $em = $this->getDoctrine()->getManager();
        $queryBuilder = $em->createQueryBuilder();

        $queryBuilder
                ->from('ChallengeReportBundle:SalesOrderLine', 'sol')
                ->innerJoin('sol.product', 'p');

        $country = $this->getParam($params, 'country');
        if (!empty($country)) {
            $queryBuilder
                    ->innerJoin('sol.salesOrder', 'so')
                    ->innerJoin('so.country', 'c')
                    ->andWhere('c.code = :country')
                    ->setParameter('country', $country);
        }

        $startDate = $this->getParam($params, 'startDate');
        if (!empty($startDate)) {
            $start = DateTime::createFromFormat($params['format'], $startDate);
            $start->setTime(0, 0, 0);
            $queryBuilder
                    ->andWhere('sol.creationDate >= :startDate')
                    ->setParameter('startDate', $start);
        }

        $endDate = $this->getParam($params, 'endDate');
        if (!empty($endDate)) {
            $end = DateTime::createFromFormat($params['format'], $endDate);
            $end->setTime(23, 59, 59);
            $queryBuilder
                    ->andWhere('sol.creationDate <= :endDate')
                    ->setParameter('endDate', $end);
        }

        $product = $this->getParam($params, 'product');
        if (!empty($product)) {
            $queryBuilder
                    ->andWhere('p.product LIKE :product')
                    ->setParameter('product', '%' . $product . '%');
        }

        return $queryBuilder;
    }

    private function prepareOrderBy($queryBuilder, $params) {

        $sort = $this->getParam($params, 'sort');
        $direction = $this->getParam($params, 'direction');
        if (!empty($sort)) {
            $queryBuilder->orderBy($sort, $direction);
        }
    }

    /**
     * @Route("/reportTest", name="reportTest")
     * @Template()
     */
    public function reportTestAction(Request $request) {

        $search_params = array();
        $search_params['country'] = $request->query->get('country');
        $search_params['product'] = $request->query->get('product');
        $search_params['startDate'] = $request->query->get('startDate');
        $search_params['endDate'] = $request->query->get('endDate');
        
        $sort_params = array();
        $sort_params['sort'] = $request->query->get('sort', 'productId');
        $sort_params['direction'] = $request->query->get('direction', 'asc');
                
        $pager_params = array();
        $pager_params['page'] = $request->query->get('page', 1);
        $pager_params['chunk'] = $request->query->get('chunk', 20);

        $misc_params = array();
        $misc_params['format'] = 'Y-m-d';
        $misc_params['jsformat'] = 'yyyy-mm-dd';
        
        $params = array_merge($search_params, $sort_params, $pager_params, $misc_params);
        $params['action'] = 'reportTest';
        
        $queryBuilder = $this->buildQueryConditions($params);

        $queryBuilder->select('COUNT (DISTINCT p.productId)');
        $count = $queryBuilder->getQuery()->getSingleScalarResult();

        $params['totalItems'] = $count;
        $params['totalPages'] = $count / $pager_params['chunk'];

        $queryBuilder->select('p.productId AS productId, 
            p.product AS product, 
            SUM(sol.quantity) AS unitsSold,  
            SUM(sol.totalCost) AS totalCost,
            SUM(sol.totalPrice) AS totalRevenue,
            SUM(sol.totalProfit) AS totalProfit')
                ->groupBy('sol.product');
        $this->prepareOrderBy($queryBuilder, $params);

        $results = $queryBuilder->getQuery()->execute();

        return array('results' => $results, 
            'search_params' => $search_params, 
            'sort_params' => $sort_params, 
            'pager_params' => $pager_params, 
            'misc_params' => $misc_params, 
            'params' => $params);
    }

}
