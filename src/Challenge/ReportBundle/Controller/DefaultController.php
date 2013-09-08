<?php

namespace Challenge\ReportBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Template;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Request;
use Challenge\ReportBundle\Entity\Product;
use Challenge\ReportBundle\Entity\SalesOrder;
use Challenge\ReportBundle\Entity\SalesOrderLine;

class DefaultController extends Controller {

    /**
     * @Route("/hello/{name}")
     * @Template()
     */
    public function helloAction($name) {
        return array('name' => $name);
    }

    private function saveAndDetach($em, $entity) {

        $em->persist($entity);
        $em->flush();

        $em->detach($entity);
    }

    private function generateProducts($size, $em) {
        for ($index = 0; $index < $size; $index++) {

            $product = new Product();
            $product->setProduct("product-$index");
            $product->setUnitPrice(200 + $index);
            $product->setUnitCost(100 + $index);

            $this->saveAndDetach($em, $product);
        }
    }

    private function getEntity($name, $em) {

        $max = 50;
        $dql = "SELECT e FROM $name e";
        $query = $em->createQuery($dql)->setMaxResults($max);

        $i = rand(0, ($max - 1));

        $results = $query->execute();

        return $results[$i];
    }

    private function generateOrders($size, $em) {
        for ($index = 0; $index < $size; $index++) {

            $order = new SalesOrder();
            $n = rand(1, 5);

            $orderLines = $this->getOrderLines($n, $em);

            $order->setCountry($this->getEntity("ChallengeReportBundle:Country", $em));
            $order->setUsername("username-$index");
            $order->setTotalPrice($orderLines['totalPrice']);

            $em->persist($order);
            $em->flush();

            foreach ($orderLines['lines'] as $orderLine) {
                $orderLine->setSalesOrder($order);
                $this->saveAndDetach($em, $orderLine);
            }

            $em->detach($order);
        }
    }

    private function getOrderLines($size, $em) {

        $totalPriceOrder = 0.0;
        $lines = array();

        for ($index = 0; $index < $size; $index++) {

            $quantity = 1 + $index;
            $product = $this->getEntity('ChallengeReportBundle:Product', $em);
            $totalPrice = $product->getUnitPrice() * $quantity;
            $totalCost = $product->getUnitCost() * $quantity;
            $totalProfit = $totalPrice - $totalCost;
            $totalPriceOrder += $totalPrice;

            $orderLine = new SalesOrderLine();
            $orderLine->setProduct($product);
            $orderLine->setQuantity($quantity);
            $orderLine->setTotalPrice($totalPrice);
            $orderLine->setTotalCost($totalCost);
            $orderLine->setTotalProfit($totalProfit);
            $orderLine->setUnitPrice($product->getUnitPrice());
            $orderLine->setUnitCost($product->getUnitCost());

            $lines[] = $orderLine;
        }

        return array('totalPrice' => $totalPriceOrder, 'lines' => $lines);
    }

    /**
     * @Route("/load")
     * @Template()
     */
    public function loadAction() {
        ini_set('max_execution_time', 300);
        $em = $this->getDoctrine()->getManager();
        $this->generateProducts(2000, $em);
        $this->generateOrders(5000, $em);

        $response = new Response();
        $response->setContent('ok!');
        $response->headers->set('Content-Type', 'text/plain');

        return $response;
    }

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
            $start = \DateTime::createFromFormat($params['format'], $startDate);
            $start->setTime(0, 0, 0);
            $queryBuilder
                    ->andWhere('sol.creationDate >= :startDate')
                    ->setParameter('startDate', $start);
        }

        $endDate = $this->getParam($params, 'endDate');
        if (!empty($endDate)) {
            $end = \DateTime::createFromFormat($params['format'], $endDate);
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
        $params['direction'] = $request->query->get('direction', 'ASC');
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

//        $em = $this->getDoctrine()->getManager();
//        $queryBuilder = $em->createQueryBuilder();
//
//        $queryBuilder->select('p.productId AS productId, 
//            p.product AS product, 
//            SUM(sol.quantity) AS unitsSold,  
//            SUM(sol.totalCost) AS totalCost,
//            SUM(sol.totalPrice) AS totalRevenue,
//            SUM(sol.totalProfit) AS totalProfit')
//                ->from('ChallengeReportBundle:SalesOrderLine', 'sol')
//                ->innerJoin('sol.product', 'p')
//                ->groupBy('sol.product')
//                ->orderBy('sol.product');
//                
//        $results = $queryBuilder->getQuery()->execute();
//
//        return array('results' => $results);
//        $em = $this->getDoctrine()->getManager();
//        $dql = 'SELECT p.productId AS productId, 
//            p.product AS product, 
//            SUM(sol.quantity) AS unitsSold,  
//            SUM(sol.totalCost) AS totalCost,
//            SUM(sol.totalPrice) AS totalRevenue,
//            SUM(sol.totalProfit) AS totalProfit
//            FROM ChallengeReportBundle:SalesOrderLine sol 
//            INNER JOIN sol.product p
//            GROUP BY sol.product
//            ORDER BY sol.product';
//        $query = $em->createQuery($dql);
//
//        $results = $query->execute();
//
//        return array('results' => $results);
    }

    /**
     * @Route("/countries")
     * @Template()
     */
    public function countriesAction() {

        $em = $this->getDoctrine()->getManager();
        $dql = "SELECT c FROM ChallengeReportBundle:Country c";
        $query = $em->createQuery($dql);

        $paginator = $this->get('knp_paginator');
        $pagination = $paginator->paginate(
                $query, $this->get('request')->query->get('page', 1)/* page number */, 10/* limit per page */
        );

        // parameters to template
        return array('pagination' => $pagination);
    }

}
