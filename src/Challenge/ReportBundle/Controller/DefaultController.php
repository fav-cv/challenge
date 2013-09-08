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
     * @Route("/report", name="report")
     * @Template()
     */
    public function reportAction(Request $request) {

        $params = array();

        $params['country'] = $request->query->get('country');
        $params['product'] = $request->query->get('product');
        $params['startDate'] = $request->query->get('startDate');
        $params['endDate'] = $request->query->get('endDate');

        $params['sort'] = $request->query->get('sort', 'productId');
        $params['direction'] = $request->query->get('direction', 'asc');
        $params['page'] = $request->query->get('page', 1);
        $params['chunk'] = $request->query->get('chunk', 20);
        
        $params['format'] = 'Y-m-d';
        $params['jsformat'] = 'yyyy-mm-dd';

//        $params['startDate'] = '2013-09-08 12:16:38';
//        $params['endDate'] = '2013-09-08 12:16:39';

        $queryBuilder = $this->buildQueryConditions($params);

        $queryBuilder->select('COUNT (DISTINCT p.productId)');
        $count = $queryBuilder->getQuery()->getSingleScalarResult();
        
        $params['totalItems'] = $count;

        $queryBuilder->select('p.productId AS productId, 
            p.product AS product, 
            SUM(sol.quantity) AS unitsSold,  
            SUM(sol.totalCost) AS totalCost,
            SUM(sol.totalPrice) AS totalRevenue,
            SUM(sol.totalProfit) AS totalProfit')
                ->groupBy('sol.product');
        $this->prepareOrderBy($queryBuilder, $params);

        $results = $queryBuilder->getQuery()->execute();

        return array('results' => $results, 'params' => $params);

    }

}
